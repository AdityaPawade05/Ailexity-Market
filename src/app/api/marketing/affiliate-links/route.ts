import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// GET: list the caller's affiliate links (across their products) with stats
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const links = await prisma.affiliateLink.findMany({
    where: { sellerId: session.userId },
    include: {
      product: { select: { id: true, title: true } },
      affiliateUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ links }, { status: 200 });
}

// POST: create an affiliate link for one of the caller's products
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId, affiliateEmail, commissionRate } = await request.json();
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { sellerId: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (product.sellerId !== session.userId) {
    return NextResponse.json(
      { error: "You can only create affiliate links for your own products" },
      { status: 403 }
    );
  }

  let affiliateUserId: string | null = null;
  if (affiliateEmail) {
    const affiliateUser = await prisma.user.findUnique({
      where: { email: affiliateEmail },
      select: { id: true },
    });
    if (!affiliateUser) {
      return NextResponse.json(
        { error: "No Ailexity account found with that email" },
        { status: 400 }
      );
    }
    if (affiliateUser.id === session.userId) {
      return NextResponse.json(
        { error: "You can't set yourself as the affiliate for your own product" },
        { status: 400 }
      );
    }
    affiliateUserId = affiliateUser.id;
  }

  let rate = 0.1;
  if (commissionRate !== undefined && commissionRate !== null && commissionRate !== "") {
    const n = Number(commissionRate);
    if (!Number.isFinite(n) || n <= 0 || n > 1) {
      return NextResponse.json(
        { error: "commissionRate must be a fraction between 0 and 1 (e.g. 0.1 for 10%)" },
        { status: 400 }
      );
    }
    rate = n;
  }

  try {
    const created = await prisma.affiliateLink.create({
      data: {
        code: randomBytes(6).toString("hex"),
        sellerId: session.userId,
        productId,
        affiliateUserId,
        commissionRate: rate,
      },
      include: {
        product: { select: { id: true, title: true } },
        affiliateUser: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Code collision, please try again" },
        { status: 500 }
      );
    }
    console.error("[AffiliateLink POST]", err);
    return NextResponse.json({ error: "Failed to create affiliate link" }, { status: 500 });
  }
}
