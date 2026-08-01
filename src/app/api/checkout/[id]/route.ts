import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { splitPayment } from "@/lib/commission";

// GET /api/checkout/[id] — public details for a shared checkout link
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const link = await prisma.checkoutLink.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, name: true, avatar: true } },
      product: { select: { id: true, title: true, type: true, imageUrl: true } },
    },
  });

  if (!link) {
    return NextResponse.json({ error: "Checkout link not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: link.id,
    title: link.title,
    amount: link.amount,
    status: link.status,
    seller: link.seller,
    product: link.product,
  });
}

// POST /api/checkout/[id] — pay a checkout link from the buyer's wallet
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const link = await prisma.checkoutLink.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, email: true } },
        // Note: deliberately no `published` check — checkout links are how
        // sellers do private sales of unlisted products.
        product: { select: { id: true, title: true } },
      },
    });

    if (!link) {
      return NextResponse.json({ error: "Checkout link not found" }, { status: 404 });
    }
    if (link.status !== "active") {
      return NextResponse.json({ error: "This checkout link is no longer active" }, { status: 410 });
    }
    if (link.sellerId === session.userId) {
      return NextResponse.json({ error: "You cannot pay your own checkout link" }, { status: 400 });
    }

    // If the link sells a specific product, don't let a buyer pay twice for it.
    if (link.productId) {
      const owned = await prisma.purchase.findFirst({
        where: { buyerId: session.userId, productId: link.productId },
        select: { id: true },
      });
      if (owned) {
        return NextResponse.json({ error: "You already own this product" }, { status: 400 });
      }
    }

    const price = link.amount;
    const { commission, sellerEarning } = splitPayment(price);

    let purchase;
    try {
      purchase = await prisma.$transaction(async (tx) => {
        // Deduct from buyer wallet — conditional decrement so concurrent
        // payments can't overdraw the balance.
        const debited = await tx.wallet.updateMany({
          where: { userId: session.userId, balance: { gte: price } },
          data: { balance: { decrement: price } },
        });
        if (debited.count === 0) {
          throw new Error("INSUFFICIENT_BALANCE");
        }
        const buyerWallet = await tx.wallet.findUniqueOrThrow({
          where: { userId: session.userId },
        });

        const sellerWallet = await tx.wallet.upsert({
          where: { userId: link.sellerId },
          update: { balance: { increment: sellerEarning } },
          create: { userId: link.sellerId, balance: sellerEarning },
        });

        await tx.platformWallet.upsert({
          where: { id: "platform" },
          update: { balance: { increment: commission } },
          create: { id: "platform", balance: commission },
        });

        const p = await tx.purchase.create({
          data: {
            buyerId: session.userId,
            sellerId: link.sellerId,
            productId: link.productId,
            amount: price,
            commissionAmount: commission,
            sellerEarning,
          },
          include: {
            buyer: { select: { id: true, name: true, email: true } },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: buyerWallet.id,
            type: "PURCHASE_DEBIT",
            amount: price,
            description: `Paid checkout link: ${link.title}`,
            purchaseId: p.id,
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: sellerWallet.id,
            type: "SALE_CREDIT",
            amount: sellerEarning,
            description: `Checkout link payment: ${link.title} (after 10% commission)`,
            purchaseId: p.id,
          },
        });

        return p;
      });
    } catch (txError) {
      if (txError instanceof Error && txError.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          { error: "Insufficient wallet balance. Please top up your wallet to continue." },
          { status: 402 }
        );
      }
      throw txError;
    }

    // Async email notifications — best effort, never blocks the response.
    const buyer = purchase.buyer;
    setTimeout(async () => {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        await sendEmail({
          to: buyer.email,
          subject: `Receipt: ${link.title}`,
          html: `
            <h2>Thank you for your payment, ${buyer.name}!</h2>
            <p>You paid <strong>$${price.toFixed(2)}</strong> for <strong>${link.title}</strong>.</p>
            ${link.product ? `<br/><a href="${appUrl}/library" style="background:#f59e0b;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;font-weight:bold;">View in Library</a>` : ""}
            <p style="margin-top:20px;font-size:12px;color:#666;">- The Ailexity Market Team</p>
          `,
        });

        await sendEmail({
          to: link.seller.email,
          subject: `Payment received: ${link.title}`,
          html: `
            <h2>You just got paid!</h2>
            <p><strong>${link.title}</strong> — $${sellerEarning.toFixed(2)} credited to your wallet (after 10% platform fee).</p>
            <br/>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/business/balances" style="background:#18181b;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;font-weight:bold;">View Wallet</a>
            <p style="margin-top:20px;font-size:12px;color:#666;">- The Ailexity Market Team</p>
          `,
        });
      } catch (mailError) {
        console.error("Failed to send checkout link emails", mailError);
      }
    }, 0);

    return NextResponse.json({
      success: true,
      purchaseId: purchase.id,
      productId: link.productId,
    });
  } catch (error) {
    console.error("Checkout link payment error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
