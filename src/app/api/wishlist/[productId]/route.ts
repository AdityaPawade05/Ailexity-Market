import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/wishlist/[productId] — remove one product from the caller's wishlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await params;
  await prisma.wishlistItem.deleteMany({ where: { userId: session.userId, productId } });

  const count = await prisma.wishlistItem.count({ where: { userId: session.userId } });
  return NextResponse.json({ success: true, count });
}
