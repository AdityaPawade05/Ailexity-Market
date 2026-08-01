import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { splitPayment } from "@/lib/commission";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = await props.params;
    const channelId = params.id;

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }
    if (channel.ownerId === session.userId) {
      return NextResponse.json({ error: "You cannot purchase your own channel" }, { status: 400 });
    }

    const isFollowing = await prisma.channelFollow.findUnique({
      where: { followerId_channelId: { followerId: session.userId, channelId } },
    });
    if (isFollowing) {
      return NextResponse.json({ error: "You are already a member" }, { status: 400 });
    }

    if (!channel.price || channel.price <= 0) {
      return NextResponse.json({ error: "Channel is entirely free, just follow it!" }, { status: 400 });
    }

    const price: number = channel.price;
    const { commission, sellerEarning } = splitPayment(price);

    // --- Atomic: deduct buyer, credit seller, credit platform, record purchase & follow ---
    await prisma.$transaction(async (tx) => {
      // 1. Deduct from buyer wallet — conditional decrement so concurrent
      // purchases can't overdraw the balance.
      const debited = await tx.wallet.updateMany({
        where: { userId: session.userId, balance: { gte: price } },
        data: { balance: { decrement: price } },
      });
      if (debited.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }
      const updatedBuyerWallet = await tx.wallet.findUniqueOrThrow({
        where: { userId: session.userId },
      });

      // 2. Credit channel owner's wallet
      const ownerWallet = await tx.wallet.upsert({
        where: { userId: channel.ownerId },
        update: { balance: { increment: sellerEarning } },
        create: { userId: channel.ownerId, balance: sellerEarning },
      });

      // 3. Credit platform wallet
      await tx.platformWallet.upsert({
        where: { id: "platform" },
        update: { balance: { increment: commission } },
        create: { id: "platform", balance: commission },
      });

      // 4. Create purchase record
      const purchase = await tx.purchase.create({
        data: {
          buyerId: session.userId,
          sellerId: channel.ownerId,
          channelId: channel.id,
          amount: price,
          commissionAmount: commission,
          sellerEarning,
        },
      });

      // 5. Buyer transaction record
      await tx.walletTransaction.create({
        data: {
          walletId: updatedBuyerWallet.id,
          type: "PURCHASE_DEBIT",
          amount: price,
          description: `Joined channel: ${channel.name}`,
          purchaseId: purchase.id,
        },
      });

      // 6. Owner transaction record
      await tx.walletTransaction.create({
        data: {
          walletId: ownerWallet.id,
          type: "SALE_CREDIT",
          amount: sellerEarning,
          description: `New member in: ${channel.name} (after 10% commission)`,
          purchaseId: purchase.id,
        },
      });

      // 7. Grant channel access
      await tx.channelFollow.create({
        data: { followerId: session.userId, channelId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        { error: "Insufficient wallet balance. Please top up your wallet to continue." },
        { status: 402 }
      );
    }
    console.error("Purchase channel error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
