import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/wishlist — the caller's saved-for-later items, with product details
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.wishlistItem.findMany({
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

// POST /api/wishlist — save a product for later
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
  if (product.sellerId === session.userId) {
    return NextResponse.json({ error: "You can't save your own product" }, { status: 400 });
  }

  const item = await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId: session.userId, productId } },
    update: {},
    create: { userId: session.userId, productId },
  });

  const count = await prisma.wishlistItem.count({ where: { userId: session.userId } });
  return NextResponse.json({ item, count }, { status: 201 });
}
