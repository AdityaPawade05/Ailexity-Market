import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/cart — the caller's cart, with each item's product details
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.cartItem.findMany({
    where: { userId: session.userId },
    include: {
      product: {
        include: { seller: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}

// POST /api/cart — add a product to the caller's cart
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await request.json();
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (!product.published) {
    return NextResponse.json({ error: "Product is not available for purchase" }, { status: 400 });
  }
  if (product.sellerId === session.userId) {
    return NextResponse.json({ error: "You cannot add your own product to your cart" }, { status: 400 });
  }

  const alreadyOwned = await prisma.purchase.findFirst({
    where: { buyerId: session.userId, productId, refunded: false },
  });
  if (alreadyOwned) {
    return NextResponse.json({ error: "You already own this product" }, { status: 400 });
  }

  const item = await prisma.cartItem.upsert({
    where: { userId_productId: { userId: session.userId, productId } },
    update: {},
    create: { userId: session.userId, productId },
  });

  const count = await prisma.cartItem.count({ where: { userId: session.userId } });
  return NextResponse.json({ item, count }, { status: 201 });
}
