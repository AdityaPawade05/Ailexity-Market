import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// DELETE: remove (kick) a member — creator only. Cancels their subscription
// (if any) too, so they lose paid access, not just their roster entry, and
// triggers the same Discord/Telegram role-removal webhook a self-cancel does.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: communityId, memberId } = await params;
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: { discordConfig: true, telegramConfig: true },
    });
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    if (community.createrId !== session.userId) {
      return NextResponse.json({ error: "Only the creator can remove members" }, { status: 403 });
    }
    if (memberId === community.createrId) {
      return NextResponse.json({ error: "The creator can't be removed" }, { status: 400 });
    }

    const membership = await prisma.communityMember.findUnique({
      where: { memberId_communityId: { memberId, communityId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "This user isn't a member" }, { status: 404 });
    }

    const activeSubscription = await prisma.communitySubscription.findFirst({
      where: { communityId, memberId, status: "active" },
    });

    await prisma.$transaction(async (tx) => {
      await tx.communityMember.delete({ where: { id: membership.id } });
      if (activeSubscription) {
        await tx.communitySubscription.update({
          where: { id: activeSubscription.id },
          data: { status: "cancelled", cancelledAt: new Date() },
        });
      }
    });

    if (activeSubscription && (community.discordConfig || community.telegramConfig)) {
      await fetch(new URL("/api/webhooks/subscription", request.url).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "subscription.cancelled",
          subscriptionId: activeSubscription.id,
        }),
      }).catch((err) => console.error("[Webhook]", err));
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Member DELETE]", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
