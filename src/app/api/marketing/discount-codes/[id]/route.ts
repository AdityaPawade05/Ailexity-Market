import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// PATCH: toggle a discount code's active state
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.discountCode.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
  }
  if (existing.sellerId !== session.userId) {
    return NextResponse.json({ error: "Only the owner can manage this code" }, { status: 403 });
  }

  const body = await request.json();
  const updated = await prisma.discountCode.update({
    where: { id },
    data: { active: Boolean(body.active) },
  });

  return NextResponse.json(updated, { status: 200 });
}

// DELETE: remove a discount code
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.discountCode.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ success: true }, { status: 200 });
  }
  if (existing.sellerId !== session.userId) {
    return NextResponse.json({ error: "Only the owner can manage this code" }, { status: 403 });
  }

  try {
    await prisma.discountCode.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ success: true }, { status: 200 });
    }
    console.error("[DiscountCode DELETE]", err);
    return NextResponse.json({ error: "Failed to delete discount code" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
