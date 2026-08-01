import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

// POST /api/purchases/[id]/refund — reverse the wallet money movement for a
// purchase and mark it refunded. Only the seller (their own sales) or an
// admin (anything) can execute a refund directly — buyers submit a request
// instead (see /refund-request) which shows up here for review. Executing
// this while a request is pending fulfills it.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      product: { select: { title: true } },
      channel: { select: { name: true } },
      buyer: { select: { name: true, email: true } },
    },
  });
  if (!purchase) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }
  if (purchase.refunded) {
    return NextResponse.json({ error: "This purchase has already been refunded" }, { status: 400 });
  }

  const isAdmin = session.role === "admin";
  const isSeller = session.userId === purchase.sellerId;

  if (!isAdmin && !isSeller) {
    return NextResponse.json(
      { error: "Only the seller or an admin can process a refund. Buyers can submit a refund request instead." },
      { status: 403 }
    );
  }

  const { reason } = await request.json().catch(() => ({ reason: undefined }));
  const itemName = purchase.product?.title ?? purchase.channel?.name ?? "this item";

  await prisma.$transaction(async (tx) => {
    // Credit the buyer back in full — always safe, wallets can only go up.
    const buyerWallet = await tx.wallet.upsert({
      where: { userId: purchase.buyerId },
      update: { balance: { increment: purchase.amount } },
      create: { userId: purchase.buyerId, balance: purchase.amount },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: buyerWallet.id,
        type: "REFUND_CREDIT",
        amount: purchase.amount,
        description: `Refund: ${itemName}`,
        purchaseId: purchase.id,
      },
    });

    // Reverse the seller's and platform's cut. This is an accounting
    // reversal, not a new payment attempt, so — unlike a purchase or a
    // withdrawal — it isn't gated on the wallet currently holding enough
    // balance; if the seller already withdrew their earnings, their wallet
    // simply goes negative to reflect what they now owe back.
    const sellerWallet = await tx.wallet.upsert({
      where: { userId: purchase.sellerId },
      update: { balance: { decrement: purchase.sellerEarning } },
      create: { userId: purchase.sellerId, balance: -purchase.sellerEarning },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: sellerWallet.id,
        type: "REFUND_DEBIT",
        amount: purchase.sellerEarning,
        description: `Refund: ${itemName}`,
        purchaseId: purchase.id,
      },
    });

    await tx.platformWallet.upsert({
      where: { id: "platform" },
      update: { balance: { decrement: purchase.commissionAmount } },
      create: { id: "platform", balance: -purchase.commissionAmount },
    });

    await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        refunded: true,
        refundedAt: new Date(),
        refundReason: typeof reason === "string" && reason.trim() ? reason.trim() : purchase.refundReason,
        refundRequestedAt: null,
      },
    });
  });

  setTimeout(async () => {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendEmail({
        to: purchase.buyer.email,
        subject: `Refund processed: ${itemName}`,
        html: `
          <h2>Your refund has been processed</h2>
          <p>$${purchase.amount.toFixed(2)} for <strong>${itemName}</strong> has been credited back to your Ailexity Market wallet.</p>
          <br/>
          <a href="${appUrl}/business/balances" style="background:#f59e0b;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;font-weight:bold;">View Wallet</a>
          <p style="margin-top:20px;font-size:12px;color:#666;">- The Ailexity Market Team</p>
        `,
      });
    } catch (err) {
      console.error("[Refund email]", err);
    }
  }, 0);

  return NextResponse.json({ success: true });
}
