import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { splitPayment } from "@/lib/commission";
import { NextRequest, NextResponse } from "next/server";

// POST: Subscribe to a community tier
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: communityId } = await params;
    const { tierId } = await request.json();

    if (!tierId) {
      return NextResponse.json(
        { error: "Tier ID is required" },
        { status: 400 }
      );
    }

    // Fetch community and tier
    const [community, tier] = await Promise.all([
      prisma.community.findUnique({
        where: { id: communityId },
        select: { id: true, createrId: true, name: true },
      }),
      prisma.subscriptionTier.findUnique({
        where: { id: tierId },
        select: { id: true, price: true, communityId: true, name: true },
      }),
    ]);

    if (!community || !tier) {
      return NextResponse.json(
        { error: "Community or tier not found" },
        { status: 404 }
      );
    }

    if (tier.communityId !== communityId) {
      return NextResponse.json(
        { error: "Tier does not belong to this community" },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription to this community
    const existingSubscription = await prisma.communitySubscription.findUnique({
      where: {
        memberId_communityId: {
          memberId: session.userId,
          communityId,
        },
      },
    });

    if (
      existingSubscription &&
      existingSubscription.status === "active" &&
      (!existingSubscription.expiresAt ||
        existingSubscription.expiresAt > new Date())
    ) {
      return NextResponse.json(
        { error: "You already have an active subscription to this community" },
        { status: 400 }
      );
    }

    // If free tier, skip wallet deduction
    if (tier.price === 0) {
      // Create free subscription
      const subscription = await prisma.communitySubscription.create({
        data: {
          memberId: session.userId,
          tierId,
          communityId,
          status: "active",
        },
      });

      // Add to community members if not already there
      await prisma.communityMember.upsert({
        where: {
          memberId_communityId: {
            memberId: session.userId,
            communityId,
          },
        },
        create: {
          memberId: session.userId,
          communityId,
        },
        update: {},
      });

      // Trigger bot integrations
      const communityWithConfigs = await prisma.community.findUnique({
        where: { id: communityId },
        include: {
          discordConfig: true,
          telegramConfig: true,
        },
      });

      if (communityWithConfigs?.discordConfig || communityWithConfigs?.telegramConfig) {
        // Queue webhook or process immediately
        await fetch(new URL("/api/webhooks/subscription", request.url).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "subscription.created",
            subscriptionId: subscription.id,
          }),
        }).catch((err) => console.error("[Free tier webhook]", err));
      }

      return NextResponse.json(
        { subscription, message: "Successfully joined free tier" },
        { status: 201 }
      );
    }

    // Tier prices are stored in cents; the wallet is denominated in dollars.
    const priceInDollars = Math.round(tier.price) / 100;
    const { commission: platformCommission, sellerEarning } = splitPayment(priceInDollars);

    // For paid tiers, use atomic wallet transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check wallet balance
      const wallet = await tx.wallet.findUnique({
        where: { userId: session.userId },
      });

      const balance = wallet?.balance || 0;
      if (balance < priceInDollars) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Deduct from buyer's wallet
      const updatedBuyerWallet = await tx.wallet.updateMany({
        where: {
          userId: session.userId,
          balance: { gte: priceInDollars },
        },
        data: {
          balance: { decrement: priceInDollars },
        },
      });

      if (updatedBuyerWallet.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Credit seller's wallet (90%)
      await tx.wallet.upsert({
        where: { userId: community.createrId },
        create: {
          userId: community.createrId,
          balance: sellerEarning,
        },
        update: {
          balance: { increment: sellerEarning },
        },
      });

      // Credit platform wallet (10%)
      await tx.platformWallet.update({
        where: { id: "platform" },
        data: {
          balance: { increment: platformCommission },
        },
      });

      // Record wallet transactions
      const buyerWallet = await tx.wallet.findUnique({
        where: { userId: session.userId },
      });

      const sellerWallet = await tx.wallet.findUnique({
        where: { userId: community.createrId },
      });

      if (buyerWallet) {
        await tx.walletTransaction.create({
          data: {
            walletId: buyerWallet.id,
            type: "PURCHASE_DEBIT",
            amount: priceInDollars,
            description: `Community subscription: ${community.name} - ${tier.name}`,
          },
        });
      }

      if (sellerWallet) {
        await tx.walletTransaction.create({
          data: {
            walletId: sellerWallet.id,
            type: "SALE_CREDIT",
            amount: sellerEarning,
            description: `Community subscription earned: ${tier.name}`,
          },
        });
      }

      // Create subscription record
      const subscription = await tx.communitySubscription.create({
        data: {
          memberId: session.userId,
          tierId,
          communityId,
          status: "active",
        },
      });

      // Add to community members
      await tx.communityMember.upsert({
        where: {
          memberId_communityId: {
            memberId: session.userId,
            communityId,
          },
        },
        create: {
          memberId: session.userId,
          communityId,
        },
        update: {},
      });

      return subscription;
    });

    // Trigger bot integrations after successful payment
    const communityWithConfigs = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        discordConfig: true,
        telegramConfig: true,
      },
    });

    if (communityWithConfigs?.discordConfig || communityWithConfigs?.telegramConfig) {
      await fetch(new URL("/api/webhooks/subscription", request.url).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "subscription.created",
          subscriptionId: result.id,
        }),
      }).catch((err) => console.error("[Webhook]", err));
    }

    return NextResponse.json(
      { subscription: result, message: "Successfully subscribed" },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Subscribe POST]", error);

    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        { error: "Insufficient wallet balance" },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
