import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseAmount } from "@/lib/money";

// POST /api/wallet/deposit — add funds to the user's wallet
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

  const wallet = await prisma.$transaction(async (tx) => {
    const w = await tx.wallet.upsert({
      where: { userId: session.userId },
      update: { balance: { increment: parsed } },
      create: { userId: session.userId, balance: parsed },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: w.id,
        type: "DEPOSIT",
        amount: parsed,
        description: `Deposited $${parsed.toFixed(2)}`,
      },
    });

    return w;
  });

  return NextResponse.json({ balance: wallet.balance });
}
