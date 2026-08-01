import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET: Get subscription details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriptionId } = await params;
    const subscription = await prisma.communitySubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        community: true,
        tier: true,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Only user can view their own subscription
    if (subscription.memberId !== session.userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json(subscription, { status: 200 });
  } catch (error) {
    console.error("[Subscription GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

// PUT: Cancel subscription
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriptionId } = await params;
    const subscription = await prisma.communitySubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    if (subscription.memberId !== session.userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    if (subscription.status !== "active") {
      return NextResponse.json(
        { error: "Subscription is not active" },
        { status: 400 }
      );
    }

    // Cancel the subscription
    const updated = await prisma.communitySubscription.update({
      where: { id: subscriptionId },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
      },
      include: {
        community: {
          include: {
            discordConfig: true,
            telegramConfig: true,
          },
        },
        tier: true,
      },
    });

    // Trigger bot integrations to remove user
    if (updated.community.discordConfig || updated.community.telegramConfig) {
      await fetch(new URL("/api/webhooks/subscription", request.url).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "subscription.cancelled",
          subscriptionId: subscriptionId,
        }),
      }).catch((err) => console.error("[Webhook]", err));
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("[Subscription PUT]", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
