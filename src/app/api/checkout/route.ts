import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseAmount } from "@/lib/money";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  const where: { sellerId: string; productId?: string } = { sellerId: session.userId };
  if (productId) where.productId = productId;

  const checkoutLinks = await prisma.checkoutLink.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { product: { select: { title: true } } },
  });

  return NextResponse.json(checkoutLinks);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { title, amount, productId } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    const checkoutLink = await prisma.checkoutLink.create({
      data: {
        title: title.trim(),
        amount: parsedAmount,
        sellerId: session.userId,
        productId: productId || null,
        status: "active",
      },
    });

    return NextResponse.json(checkoutLink);
  } catch (error) {
    console.error("Checkout link creation error:", error);
    return NextResponse.json({ error: "Failed to create checkout link" }, { status: 500 });
  }
}
