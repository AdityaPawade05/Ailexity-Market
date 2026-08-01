import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTelegramInviteLink } from "@/lib/bot-integrations";
import { NextRequest, NextResponse } from "next/server";

// GET /api/communities/[id]/access — subscriber-facing view of their access state
// for a community: are they subscribed, which platforms are connected, have they
// linked Discord, and (for Telegram) a single-use invite link. Returns NO secrets.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: communityId } = await params;

    const [community, subscription, user] = await Promise.all([
      prisma.community.findUnique({
        where: { id: communityId },
        include: { discordConfig: true, telegramConfig: true },
      }),
      prisma.communitySubscription.findUnique({
        where: {
          memberId_communityId: { memberId: session.userId, communityId },
        },
        include: { tier: { select: { name: true } } },
      }),
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { discordUserId: true, telegramUserId: true },
      }),
    ]);

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const isActive =
      subscription?.status === "active" &&
      (!subscription.expiresAt || subscription.expiresAt > new Date());

    // Mint a single-use Telegram invite only for active subscribers.
    let telegramInviteLink: string | null = null;
    if (isActive && community.telegramConfig?.groupId) {
      const expireDate = Math.floor(Date.now() / 1000) + 48 * 3600;
      telegramInviteLink = await createTelegramInviteLink(
        community.telegramConfig.botToken,
        community.telegramConfig.groupId,
        expireDate
      );
    }

    return NextResponse.json(
      {
        community: { id: community.id, name: community.name },
        subscription: subscription
          ? {
              status: subscription.status,
              active: isActive,
              tierName: subscription.tier?.name ?? null,
            }
          : null,
        discord: {
          configured: !!community.discordConfig,
          linked: !!user?.discordUserId,
          serverId: community.discordConfig?.serverId ?? null,
        },
        telegram: {
          configured: !!community.telegramConfig,
          linked: !!user?.telegramUserId,
          inviteLink: telegramInviteLink,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Community access GET]", error);
    return NextResponse.json(
      { error: "Failed to load access status" },
      { status: 500 }
    );
  }
}
