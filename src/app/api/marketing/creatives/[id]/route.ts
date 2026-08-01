import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// DELETE: remove a creative asset
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.marketingCreative.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ success: true }, { status: 200 });
  }
  if (existing.sellerId !== session.userId) {
    return NextResponse.json({ error: "Only the owner can manage this creative" }, { status: 403 });
  }

  try {
    await prisma.marketingCreative.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ success: true }, { status: 200 });
    }
    console.error("[MarketingCreative DELETE]", err);
    return NextResponse.json({ error: "Failed to delete creative" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
