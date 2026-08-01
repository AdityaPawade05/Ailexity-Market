import { prisma } from "@/lib/prisma";
import {
  handleSubscriptionCreated,
  handleSubscriptionCancelled,
} from "@/lib/bot-integrations";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, subscriptionId } = body;

    if (!event || !subscriptionId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const subscription = await prisma.communitySubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        community: {
          include: {
            discordConfig: true,
            telegramConfig: true,
          },
        },
        member: {
          select: {
            discordUserId: true,
            discordAccessToken: true,
            telegramUserId: true,
          },
        },
        tier: {
          select: { discordRoleId: true },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const { community, member } = subscription;
    // Resolve the member's platform-native ids (NOT the Ailexity user id).
    const identity = {
      discordUserId: member.discordUserId,
      discordAccessToken: member.discordAccessToken,
      telegramUserId: member.telegramUserId,
    };

    const tierRoleId = subscription.tier?.discordRoleId;

    if (event === "subscription.created" || event === "subscription.renewed") {
      const outcome = await handleSubscriptionCreated(
        community.id,
        identity,
        community.discordConfig,
        community.telegramConfig,
        tierRoleId
      );
      return NextResponse.json(
        { success: true, message: `Webhook processed: ${event}`, outcome },
        { status: 200 }
      );
    } else if (
      event === "subscription.cancelled" ||
      event === "subscription.canceled"
    ) {
      await handleSubscriptionCancelled(
        community.id,
        identity,
        community.discordConfig,
        community.telegramConfig,
        tierRoleId
      );
    }

    return NextResponse.json(
      { success: true, message: `Webhook processed: ${event}` },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Webhook POST]", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
