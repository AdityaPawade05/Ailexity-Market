import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// GET /api/products/[id]/reviews — public list + rating aggregate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reviews = await prisma.review.findMany({
    where: { productId: id },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });

  const count = reviews.length;
  const average = count > 0 ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : null;

  return NextResponse.json({ reviews, average, count });
}

// POST /api/products/[id]/reviews — write a review (any logged-in user
// except the product's own seller — no purchase required)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { rating, comment } = await request.json();

  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: "Rating must be a whole number from 1 to 5" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id }, select: { sellerId: true } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (product.sellerId === session.userId) {
    return NextResponse.json({ error: "You can't review your own product" }, { status: 400 });
  }

  try {
    const review = await prisma.review.create({
      data: {
        productId: id,
        userId: session.userId,
        rating: ratingNum,
        comment: comment && typeof comment === "string" && comment.trim() ? comment.trim() : null,
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "You've already reviewed this product — edit your existing review instead" },
        { status: 400 }
      );
    }
    console.error("[Review POST]", err);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
