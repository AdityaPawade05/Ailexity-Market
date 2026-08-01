import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/wallet/transactions/[id] — receipt detail for one of the user's transactions
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;

  const wallet = await prisma.wallet.findUnique({ where: { userId: session.userId } });
  if (!wallet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const transaction = await prisma.walletTransaction.findFirst({
    where: { id, walletId: wallet.id },
  });
  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let purchase = null;
  if (transaction.purchaseId) {
    purchase = await prisma.purchase.findUnique({
      where: { id: transaction.purchaseId },
      include: {
        product: { select: { id: true, title: true, type: true } },
        channel: { select: { id: true, name: true } },
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
      },
    });
  }

  return NextResponse.json({ transaction, purchase });
}
