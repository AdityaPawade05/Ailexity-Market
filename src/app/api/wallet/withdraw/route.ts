import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseAmount } from "@/lib/money";

// POST /api/wallet/withdraw — withdraw funds from the user's wallet
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount } = await request.json();
  const parsed = parseAmount(amount);
  if (parsed === null) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const wallet = await prisma.$transaction(async (tx) => {
      // Conditional decrement — guards against concurrent requests
      // overdrawing the balance.
      const debited = await tx.wallet.updateMany({
        where: { userId: session.userId, balance: { gte: parsed } },
        data: { balance: { decrement: parsed } },
      });
      if (debited.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const w = await tx.wallet.findUniqueOrThrow({ where: { userId: session.userId } });

      await tx.walletTransaction.create({
        data: {
          walletId: w.id,
          type: "WITHDRAWAL",
          amount: parsed,
          description: `Withdrew $${parsed.toFixed(2)}`,
        },
      });

      return w;
    });

    return NextResponse.json({ balance: wallet.balance });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }
    console.error("Withdraw error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
