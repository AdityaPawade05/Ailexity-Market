import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { splitPayment } from "@/lib/commission";
import { resolveDiscountCode, computeDiscountedPrice } from "@/lib/discount-codes";
import type { DiscountCode, AffiliateLink } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const asSeller = searchParams.get("as") === "seller";
  const productId = searchParams.get("productId");
  const channelId = searchParams.get("channelId");

  const where: { sellerId?: string; buyerId?: string; productId?: string; channelId?: string } =
    asSeller ? { sellerId: session.userId } : { buyerId: session.userId };

  if (productId) where.productId = productId;
  if (channelId) where.channelId = channelId;

  const purchases = await prisma.purchase.findMany({
    where,
    include: {
      product: true,
      channel: true,
      buyer: { select: { id: true, name: true, email: true, location: true } },
      seller: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(purchases);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { productId, referredBy, discountCode, affiliateCode } = await request.json();
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (!product.published) {
      return NextResponse.json({ error: "Product is not available for purchase" }, { status: 400 });
    }
    if (product.sellerId === session.userId) {
      return NextResponse.json({ error: "You cannot purchase your own product" }, { status: 400 });
    }

    const existing = await prisma.purchase.findFirst({
      where: { buyerId: session.userId, productId, refunded: false },
    });
    if (existing) {
      return NextResponse.json({ error: "You already own this product" }, { status: 400 });
    }

    let price = product.price;
    let discountAmount = 0;
    let appliedDiscountCode: DiscountCode | null = null;
    if (typeof discountCode === "string" && discountCode.trim()) {
      const result = await resolveDiscountCode(discountCode, product.sellerId, product.id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      appliedDiscountCode = result.discountCode;
      price = computeDiscountedPrice(product.price, appliedDiscountCode);
      discountAmount = Math.round((product.price - price) * 100) / 100;
    }

    // Affiliate tracking is silent/best-effort — it rides along from a shared
    // URL (?aff=), not something the buyer typed expecting a guaranteed effect,
    // so an invalid/expired code just means no commission, not a failed purchase.
    let affiliateLink: AffiliateLink | null = null;
    if (typeof affiliateCode === "string" && affiliateCode.trim()) {
      const link = await prisma.affiliateLink.findUnique({ where: { code: affiliateCode.trim() } });
      if (link && link.active && link.productId === product.id && link.affiliateUserId !== session.userId) {
        affiliateLink = link;
      }
    }

    const { commission, sellerEarning } = splitPayment(price);

    let validReferrer: string | null = null;
    if (referredBy && typeof referredBy === "string" && referredBy !== session.userId) {
      // Only credit referrals to real accounts.
      const referrer = await prisma.user.findUnique({
        where: { id: referredBy },
        select: { id: true },
      });
      if (referrer) validReferrer = referrer.id;
    }

    // --- Atomic: deduct buyer, credit seller, credit platform, record purchase ---
    let purchase;
    try {
      purchase = await prisma.$transaction(async (tx) => {
      // 0. Redeem the discount code (if any) — atomic guard on the redemption
      // limit, same pattern as the wallet-balance guard below: compare against
      // a snapshot value in the WHERE, never read-then-write.
      if (appliedDiscountCode) {
        if (appliedDiscountCode.maxRedemptions !== null) {
          const redeemed = await tx.discountCode.updateMany({
            where: {
              id: appliedDiscountCode.id,
              active: true,
              timesRedeemed: { lt: appliedDiscountCode.maxRedemptions },
            },
            data: { timesRedeemed: { increment: 1 } },
          });
          if (redeemed.count === 0) {
            throw new Error("COUPON_EXHAUSTED");
          }
        } else {
          await tx.discountCode.update({
            where: { id: appliedDiscountCode.id },
            data: { timesRedeemed: { increment: 1 } },
          });
        }
      }

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

      // 2. Credit seller wallet (upsert in case seller hasn't deposited yet)
      const sellerWallet = await tx.wallet.upsert({
        where: { userId: product.sellerId },
        update: { balance: { increment: sellerEarning } },
        create: { userId: product.sellerId, balance: sellerEarning },
      });

      // 3. Credit Ailexity platform wallet
      await tx.platformWallet.upsert({
        where: { id: "platform" },
        update: { balance: { increment: commission } },
        create: { id: "platform", balance: commission },
      });

      // 4. Create the purchase record
      const p = await tx.purchase.create({
        data: {
          buyerId: session.userId,
          sellerId: product.sellerId,
          productId: product.id,
          amount: price,
          commissionAmount: commission,
          sellerEarning,
          referredBy: validReferrer,
          discountCodeId: appliedDiscountCode?.id ?? null,
          discountAmount,
          affiliateLinkId: affiliateLink?.id ?? null,
        },
        include: {
          product: true,
          seller: { select: { id: true, name: true, email: true } },
          buyer: { select: { id: true, name: true, email: true } },
        },
      });

      // 5. Buyer transaction record
      await tx.walletTransaction.create({
        data: {
          walletId: updatedBuyerWallet.id,
          type: "PURCHASE_DEBIT",
          amount: price,
          description: `Purchased: ${product.title}`,
          purchaseId: p.id,
        },
      });

      // 6. Seller transaction record
      await tx.walletTransaction.create({
        data: {
          walletId: sellerWallet.id,
          type: "SALE_CREDIT",
          amount: sellerEarning,
          description: `Sale of: ${product.title} (after 10% commission)`,
          purchaseId: p.id,
        },
      });

      // 7. Affiliate conversion tracking — credited atomically alongside the
      // sale rather than best-effort after commit, unlike the flat
      // referral-freebie reward below (a separate, pre-existing mechanism).
      // A link with no affiliateUserId is tracking-only: conversions still
      // count, but there's no one to pay.
      if (affiliateLink) {
        const affiliateCommission = affiliateLink.affiliateUserId
          ? Math.round(price * affiliateLink.commissionRate * 100) / 100
          : 0;

        if (affiliateLink.affiliateUserId) {
          const affiliateWallet = await tx.wallet.upsert({
            where: { userId: affiliateLink.affiliateUserId },
            update: { balance: { increment: affiliateCommission } },
            create: { userId: affiliateLink.affiliateUserId, balance: affiliateCommission },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: affiliateWallet.id,
              type: "AFFILIATE_COMMISSION",
              amount: affiliateCommission,
              description: `Affiliate commission: ${product.title}`,
              purchaseId: p.id,
            },
          });
        }

        await tx.affiliateLink.update({
          where: { id: affiliateLink.id },
          data: {
            conversions: { increment: 1 },
            totalEarned: { increment: affiliateCommission },
          },
        });
      }

      return p;
      });
    } catch (txError) {
      if (txError instanceof Error && txError.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          { error: "Insufficient wallet balance. Please top up your wallet to continue." },
          { status: 402 }
        );
      }
      if (txError instanceof Error && txError.message === "COUPON_EXHAUSTED") {
        return NextResponse.json(
          { error: "This discount code just reached its redemption limit. Please try again without it." },
          { status: 400 }
        );
      }
      throw txError;
    }

    // Referral reward: every 10 referrals grants a free ebook
    if (validReferrer) {
      try {
        const referralCount = await prisma.purchase.count({ where: { referredBy: validReferrer } });

        if (referralCount % 10 === 0 && referralCount > 0) {
          const ownedIds = (
            await prisma.purchase.findMany({
              where: { buyerId: validReferrer },
              select: { productId: true },
            })
          )
            .map((p) => p.productId)
            .filter((id): id is string => id !== null);

          const freeBook = await prisma.product.findFirst({
            where: { published: true, type: "ebook", id: { notIn: ownedIds } },
          });

          if (freeBook) {
            await prisma.purchase.create({
              data: {
                buyerId: validReferrer,
                sellerId: freeBook.sellerId,
                productId: freeBook.id,
                amount: 0,
                commissionAmount: 0,
                sellerEarning: 0,
              },
            });
          }
        }
      } catch (err) {
        console.error("Referral reward error:", err);
      }
    }

    // Async email notifications
    if (purchase?.buyer && purchase?.seller && purchase?.product) {
      const { email: buyerEmail, name: buyerName } = purchase.buyer;
      const { email: sellerEmail } = purchase.seller;
      const productTitle = purchase.product.title;

      setTimeout(async () => {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

          await sendEmail({
            to: buyerEmail,
            subject: `Receipt: ${productTitle}`,
            html: `
              <h2>Thank you for your purchase, ${buyerName}!</h2>
              <p>You successfully purchased <strong>${productTitle}</strong> for $${price.toFixed(2)}.</p>
              <br/>
              <a href="${appUrl}/library" style="background:#f59e0b;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;font-weight:bold;">View in Library</a>
              <p style="margin-top:20px;font-size:12px;color:#666;">- The Ailexity Market Team</p>
            `,
          });

          await sendEmail({
            to: sellerEmail,
            subject: `New Sale: ${productTitle}`,
            html: `
              <h2>You just made a sale!</h2>
              <p><strong>${productTitle}</strong> — $${sellerEarning.toFixed(2)} credited to your wallet (after 10% platform fee).</p>
              <br/>
              <a href="${appUrl}/business/balances" style="background:#18181b;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;font-weight:bold;">View Wallet</a>
              <p style="margin-top:20px;font-size:12px;color:#666;">- The Ailexity Market Team</p>
            `,
          });
        } catch (mailError) {
          console.error("Failed to send purchase emails", mailError);
        }
      }, 0);
    }

    return NextResponse.json(purchase);
  } catch (error) {
    console.error("Purchase error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
