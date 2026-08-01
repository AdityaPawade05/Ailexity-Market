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

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { product: { select: { title: true } } },
  });

  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { amount, customerName, customerEmail, description, dueDate, productId } = body;

    if (!customerName || !customerEmail) {
      return NextResponse.json(
        { error: "Customer name and email are required" },
        { status: 400 }
      );
    }

    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    const parsedDueDate = new Date(dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
    }

    const invoice = await prisma.invoice.create({
      data: {
        amount: parsedAmount,
        customerName,
        customerEmail,
        description,
        dueDate: parsedDueDate,
        status: "pending",
        sellerId: session.userId,
        productId: productId || null,
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Invoice creation error:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
