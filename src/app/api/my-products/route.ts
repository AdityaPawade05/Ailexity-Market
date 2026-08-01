import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: { sellerId: session.userId },
    include: { _count: { select: { purchases: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products);
}
