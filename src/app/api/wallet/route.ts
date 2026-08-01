import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/wallet — return current user's wallet (creates it if it doesn't exist)
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let wallet = await prisma.wallet.findUnique({ where: { userId: session.userId } });

  if (!wallet) {
    wallet = await prisma.$transaction(async (tx) => {
      const created = await tx.wallet.create({
        data: { userId: session.userId, balance: 100 },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: created.id,
          type: "DEPOSIT",
          amount: 100,
          description: "Welcome bonus — demo funds",
        },
      });
      return created;
    });
  }

  return NextResponse.json({ balance: wallet.balance, walletId: wallet.id });
}
