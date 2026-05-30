import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const asSeller = searchParams.get("as") === "seller";
  const productId = searchParams.get("productId");
  const channelId = searchParams.get("channelId");

  const where: any = asSeller
    ? { sellerId: session.userId }
    : { buyerId: session.userId };

  if (productId) {
    where.productId = productId;
  }
  if (channelId) {
    where.channelId = channelId;
  }

  const purchases = await prisma.purchase.findMany({
    where,
    include: {
      product: true,
      channel: true,
      buyer: { select: { id: true, name: true, email: true } },
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
    const { productId, referredBy } = await request.json();
    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!product.published) {
      return NextResponse.json(
        { error: "Product is not available for purchase" },
        { status: 400 }
      );
    }

    if (product.sellerId === session.userId) {
      return NextResponse.json(
        { error: "You cannot purchase your own product" },
        { status: 400 }
      );
    }

    const existing = await prisma.purchase.findFirst({
      where: {
        buyerId: session.userId,
        productId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You already own this product" },
        { status: 400 }
      );
    }

    const validReferrer = referredBy && typeof referredBy === "string" && referredBy !== session.userId ? referredBy : null;

    let purchase;
    try {
      purchase = await prisma.purchase.create({
        data: {
          buyerId: session.userId,
          sellerId: product.sellerId,
          productId: product.id,
          amount: product.price,
          referredBy: validReferrer, // Will throw if Prisma Client isn't regenerated
        },
        include: {
          product: true,
          seller: { select: { id: true, name: true, email: true } },
          buyer: { select: { id: true, name: true, email: true } },
        },
      });
    } catch (dbError: any) {
      // Fallback if the user's Prisma client hasn't been re-generated to include 'referredBy'
      if (dbError.message?.includes('Unknown argument')) {
        purchase = await prisma.purchase.create({
          data: {
            buyerId: session.userId,
            sellerId: product.sellerId,
            productId: product.id,
            amount: product.price,
          },
          include: {
            product: true,
            seller: { select: { id: true, name: true, email: true } },
            buyer: { select: { id: true, name: true, email: true } },
          },
        });
      } else {
        throw dbError;
      }
    }

    // Referral Algorithm: Grant a free book every 10 valid referrals
    if (validReferrer) {
      try {
        const referralCount = await prisma.purchase.count({
          where: { referredBy: validReferrer }
        });

        if (referralCount % 10 === 0 && referralCount > 0) {
          const ownedPurchases = await prisma.purchase.findMany({
            where: { buyerId: validReferrer },
            select: { productId: true }
          });
          const ownedProductIds = ownedPurchases
            .map(p => p.productId)
            .filter((id): id is string => id !== null);

          const availableFreeBooks = await prisma.product.findMany({
            where: {
              published: true,
              type: "ebook",
              id: { notIn: ownedProductIds }
            },
            take: 1
          });

          if (availableFreeBooks.length > 0) {
            const rewardBook = availableFreeBooks[0];
            await prisma.purchase.create({
              data: {
                buyerId: validReferrer,
                sellerId: rewardBook.sellerId,
                productId: rewardBook.id,
                amount: 0,
              }
            });
            console.log(`Granted free book ${rewardBook.id} to user ${validReferrer}`);
          }
        }
      } catch (err) {
        console.error("Error processing referral reward:", err);
      }
    }

    // Send asynchronous email notifications
    if (purchase && purchase.buyer && purchase.seller && purchase.product) {
      const buyerEmail = purchase.buyer.email;
      const buyerName = purchase.buyer.name;
      const sellerEmail = purchase.seller.email;
      const productTitle = purchase.product.title;
      const purchaseAmount = purchase.amount;

      setTimeout(async () => {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          
          // 1. Send Buyer Receipt
          await sendEmail({
            to: buyerEmail,
            subject: `Receipt: ${productTitle}`,
            html: `
              <h2>Thank you for your purchase, ${buyerName}!</h2>
              <p>You successfully purchased <strong>${productTitle}</strong> for $${purchaseAmount.toFixed(2)}.</p>
              <br/>
              <a href="${appUrl}/library" style="background:#f59e0b;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;font-weight:bold;">
                View in Library
              </a>
              <p style="margin-top:20px;font-size:12px;color:#666;">- The Ailexity Market Team</p>
            `,
          });

          // 2. Send Seller Alert
          await sendEmail({
            to: sellerEmail,
            subject: `🎉 New Sale: ${productTitle}`,
            html: `
              <h2>Cha-Ching! ${buyerName} bought your product!</h2>
              <p>You just made a sale of <strong>$${purchaseAmount.toFixed(2)}</strong> for ${productTitle}.</p>
              <br/>
              <a href="${appUrl}/dashboard" style="background:#18181b;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;font-weight:bold;">
                View Dashboard
              </a>
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
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
