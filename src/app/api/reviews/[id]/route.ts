import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/reviews/[id] — edit your own review
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }
  if (existing.userId !== session.userId) {
    return NextResponse.json({ error: "You can only edit your own review" }, { status: 403 });
  }

  const { rating, comment } = await request.json();

  const data: { rating?: number; comment?: string | null } = {};
  if (rating !== undefined) {
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: "Rating must be a whole number from 1 to 5" }, { status: 400 });
    }
    data.rating = ratingNum;
  }
  if (comment !== undefined) {
    data.comment = typeof comment === "string" && comment.trim() ? comment.trim() : null;
  }

  const updated = await prisma.review.update({
    where: { id },
    data,
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });
  return NextResponse.json(updated);
}

// DELETE /api/reviews/[id] — remove your own review (or an admin moderating)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ success: true }, { status: 200 });
  }
  if (existing.userId !== session.userId && session.role !== "admin") {
    return NextResponse.json({ error: "You can only delete your own review" }, { status: 403 });
  }

  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
