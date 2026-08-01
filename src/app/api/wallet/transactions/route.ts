import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/wallet/transactions — list all wallet transactions for current user
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: session.userId } });
  if (!wallet) {
    return NextResponse.json([]);
  }

  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(transactions);
}
