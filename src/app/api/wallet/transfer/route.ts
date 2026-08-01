import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseAmount } from "@/lib/money";

// POST /api/wallet/transfer — send money to another user by email
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recipientEmail, amount: rawAmount, note } = await request.json();

  const amount = parseAmount(rawAmount);
  if (amount === null) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (typeof recipientEmail !== "string" || !recipientEmail.trim()) {
    return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({
    where: { email: recipientEmail.trim().toLowerCase() },
  });
  if (!recipient) {
    return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
  }
  if (recipient.id === session.userId) {
    return NextResponse.json({ error: "You cannot send money to yourself" }, { status: 400 });
  }

  const sender = await prisma.user.findUnique({ where: { id: session.userId } });

  const trimmedNote = typeof note === "string" ? note.trim().slice(0, 200) : "";

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Conditional decrement — guards against concurrent transfers
      // overdrawing the balance.
      const debited = await tx.wallet.updateMany({
        where: { userId: session.userId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debited.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const updatedSenderWallet = await tx.wallet.findUniqueOrThrow({
        where: { userId: session.userId },
      });

      const recipientWallet = await tx.wallet.upsert({
        where: { userId: recipient.id },
        update: { balance: { increment: amount } },
        create: { userId: recipient.id, balance: amount },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: updatedSenderWallet.id,
          type: "TRANSFER_OUT",
          amount,
          description: `Sent to ${recipient.name} (${recipient.email})${trimmedNote ? ` — ${trimmedNote}` : ""}`,
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: recipientWallet.id,
          type: "TRANSFER_IN",
          amount,
          description: `Received from ${sender?.name ?? "a user"} (${sender?.email ?? ""})${trimmedNote ? ` — ${trimmedNote}` : ""}`,
        },
      });

      return updatedSenderWallet;
    });

    return NextResponse.json({ balance: result.balance });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
    }
    console.error("Transfer error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
