import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAmount } from "@/lib/money";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// GET: list the caller's discount codes across all of their products
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const codes = await prisma.discountCode.findMany({
    where: { sellerId: session.userId },
    include: { product: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ codes }, { status: 200 });
}

// POST: create a discount code for one of the caller's products (or all of them)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { productId, type, maxRedemptions, expiresAt } = body;
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }
  if (type !== "PERCENT" && type !== "FIXED") {
    return NextResponse.json({ error: 'type must be "PERCENT" or "FIXED"' }, { status: 400 });
  }

  let value: number;
  if (type === "PERCENT") {
    value = Number(body.value);
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      return NextResponse.json(
        { error: "Percent discounts must be a whole number between 1 and 100" },
        { status: 400 }
      );
    }
  } else {
    const parsed = parseAmount(body.value);
    if (parsed === null) {
      return NextResponse.json({ error: "Invalid fixed discount amount" }, { status: 400 });
    }
    value = parsed;
  }

  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { sellerId: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (product.sellerId !== session.userId) {
      return NextResponse.json(
        { error: "You can only create discount codes for your own products" },
        { status: 403 }
      );
    }
  }

  let maxRedemptionsValue: number | null = null;
  if (maxRedemptions !== undefined && maxRedemptions !== null && maxRedemptions !== "") {
    const n = Number(maxRedemptions);
    if (!Number.isInteger(n) || n < 1) {
      return NextResponse.json(
        { error: "maxRedemptions must be a positive whole number" },
        { status: 400 }
      );
    }
    maxRedemptionsValue = n;
  }

  let expiresAtValue: Date | null = null;
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid expiresAt date" }, { status: 400 });
    }
    expiresAtValue = d;
  }

  try {
    const created = await prisma.discountCode.create({
      data: {
        code,
        sellerId: session.userId,
        productId: productId || null,
        type,
        value,
        maxRedemptions: maxRedemptionsValue,
        expiresAt: expiresAtValue,
      },
      include: { product: { select: { id: true, title: true } } },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "You already have a discount code with that code" },
        { status: 400 }
      );
    }
    console.error("[DiscountCode POST]", err);
    return NextResponse.json({ error: "Failed to create discount code" }, { status: 500 });
  }
}
