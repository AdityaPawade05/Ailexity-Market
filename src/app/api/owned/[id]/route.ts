import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        product: {
          include: { seller: { select: { name: true } } },
        },
      },
    });

    if (!purchase || purchase.buyerId !== session.userId) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }
    if (purchase.refunded) {
      return NextResponse.json({ error: "This purchase was refunded — access has been revoked" }, { status: 403 });
    }

    return NextResponse.json(purchase);
  } catch (error) {
    console.error("Fetch purchase error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
