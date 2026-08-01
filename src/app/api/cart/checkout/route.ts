import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { splitPayment } from "@/lib/commission";
import { NextResponse } from "next/server";

// POST /api/cart/checkout — buy every purchasable item in the caller's cart
// in one shot. Discount codes and affiliate links aren't supported here —
// those still go through the single-item "Buy Now" flow on the product page.
export async function POST() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: session.userId },
    include: { product: true },
  });
  if (cartItems.length === 0) {
    return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
  }

  const alreadyOwnedIds = new Set(
    (
      await prisma.purchase.findMany({
        where: { buyerId: session.userId, productId: { in: cartItems.map((i) => i.productId) }, refunded: false },
        select: { productId: true },
      })
    ).map((p) => p.productId)
  );

  const purchasable: typeof cartItems = [];
  const skipped: { productId: string; title: string; reason: string }[] = [];
  for (const item of cartItems) {
    if (!item.product.published) {
      skipped.push({ productId: item.productId, title: item.product.title, reason: "no longer available" });
    } else if (item.product.sellerId === session.userId) {
      skipped.push({ productId: item.productId, title: item.product.title, reason: "you own this listing" });
    } else if (alreadyOwnedIds.has(item.productId)) {
      skipped.push({ productId: item.productId, title: item.product.title, reason: "already purchased" });
    } else {
      purchasable.push(item);
    }
  }

  // Drop anything that can no longer be bought regardless of outcome below.
  if (skipped.length > 0) {
    await prisma.cartItem.deleteMany({
      where: { userId: session.userId, productId: { in: skipped.map((s) => s.productId) } },
    });
  }

  if (purchasable.length === 0) {
    return NextResponse.json(
      { error: "Nothing left to check out in your cart", skipped },
      { status: 400 }
    );
  }

  const total = Math.round(purchasable.reduce((sum, i) => sum + i.product.price, 0) * 100) / 100;

  let purchases;
  try {
    purchases = await prisma.$transaction(async (tx) => {
      const debited = await tx.wallet.updateMany({
        where: { userId: session.userId, balance: { gte: total } },
        data: { balance: { decrement: total } },
      });
      if (debited.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }
      const buyerWallet = await tx.wallet.findUniqueOrThrow({ where: { userId: session.userId } });

      const created = [];
      for (const item of purchasable) {
        const { commission, sellerEarning } = splitPayment(item.product.price);

        const sellerWallet = await tx.wallet.upsert({
          where: { userId: item.product.sellerId },
          update: { balance: { increment: sellerEarning } },
          create: { userId: item.product.sellerId, balance: sellerEarning },
        });
        await tx.platformWallet.upsert({
          where: { id: "platform" },
          update: { balance: { increment: commission } },
          create: { id: "platform", balance: commission },
        });

        const p = await tx.purchase.create({
          data: {
            buyerId: session.userId,
            sellerId: item.product.sellerId,
            productId: item.productId,
            amount: item.product.price,
            commissionAmount: commission,
            sellerEarning,
          },
          include: {
            product: true,
            seller: { select: { id: true, name: true, email: true } },
            buyer: { select: { id: true, name: true, email: true } },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: buyerWallet.id,
            type: "PURCHASE_DEBIT",
            amount: item.product.price,
            description: `Purchased: ${item.product.title}`,
            purchaseId: p.id,
          },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: sellerWallet.id,
            type: "SALE_CREDIT",
            amount: sellerEarning,
            description: `Sale of: ${item.product.title} (after 10% commission)`,
            purchaseId: p.id,
          },
        });

        created.push(p);
      }

      await tx.cartItem.deleteMany({
        where: { userId: session.userId, productId: { in: purchasable.map((i) => i.productId) } },
      });

      return created;
    });
  } catch (txError) {
    if (txError instanceof Error && txError.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        { error: "Insufficient wallet balance. Please top up your wallet to continue.", skipped },
        { status: 402 }
      );
    }
    console.error("[Cart checkout]", txError);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Async receipts — one buyer summary + one notification per seller sale.
  setTimeout(async () => {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const buyer = purchases[0].buyer;

      const itemsHtml = purchases.map((p) => `<li>${p.product!.title} — $${p.amount.toFixed(2)}</li>`).join("");
      await sendEmail({
        to: buyer.email,
        subject: `Receipt: ${purchases.length} item${purchases.length === 1 ? "" : "s"} purchased`,
        html: `
          <h2>Thank you for your purchase, ${buyer.name}!</h2>
          <p>You successfully purchased ${purchases.length} item${purchases.length === 1 ? "" : "s"} for a total of $${total.toFixed(2)}:</p>
          <ul>${itemsHtml}</ul>
          <br/>
          <a href="${appUrl}/library" style="background:#f59e0b;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;font-weight:bold;">View in Library</a>
          <p style="margin-top:20px;font-size:12px;color:#666;">- The Ailexity Market Team</p>
        `,
      });

      for (const p of purchases) {
        await sendEmail({
          to: p.seller.email,
          subject: `New Sale: ${p.product!.title}`,
          html: `
            <h2>You just made a sale!</h2>
            <p><strong>${p.product!.title}</strong> — $${p.sellerEarning.toFixed(2)} credited to your wallet (after 10% platform fee).</p>
            <br/>
            <a href="${appUrl}/business/balances" style="background:#18181b;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;font-weight:bold;">View Wallet</a>
            <p style="margin-top:20px;font-size:12px;color:#666;">- The Ailexity Market Team</p>
          `,
        });
      }
    } catch (mailError) {
      console.error("Failed to send cart checkout emails", mailError);
    }
  }, 0);

  return NextResponse.json({ purchases, skipped, total });
}
