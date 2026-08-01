import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/cart/[productId] — remove one product from the caller's cart
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await params;
  await prisma.cartItem.deleteMany({ where: { userId: session.userId, productId } });

  const count = await prisma.cartItem.count({ where: { userId: session.userId } });
  return NextResponse.json({ success: true, count });
}
