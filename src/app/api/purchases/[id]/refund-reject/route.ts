import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

// POST /api/purchases/[id]/refund-reject — seller or admin declines a
// pending buyer refund request without moving any money.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      product: { select: { title: true } },
      channel: { select: { name: true } },
      buyer: { select: { name: true, email: true } },
    },
  });
  if (!purchase) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }

  const isAdmin = session.role === "admin";
  const isSeller = session.userId === purchase.sellerId;
  if (!isAdmin && !isSeller) {
    return NextResponse.json({ error: "You don't have permission to decline this request" }, { status: 403 });
  }
  if (!purchase.refundRequestedAt) {
    return NextResponse.json({ error: "There's no pending refund request on this purchase" }, { status: 400 });
  }

  const { note } = await request.json().catch(() => ({ note: undefined }));
  const trimmedNote = typeof note === "string" && note.trim() ? note.trim() : null;
  const itemName = purchase.product?.title ?? purchase.channel?.name ?? "this item";

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: { refundRequestedAt: null },
  });

  setTimeout(async () => {
    try {
      await sendEmail({
        to: purchase.buyer.email,
        subject: `Refund request declined: ${itemName}`,
        html: `
          <h2>Your refund request was declined</h2>
          <p>Your refund request for <strong>${itemName}</strong> ($${purchase.amount.toFixed(2)}) was declined.</p>
          ${trimmedNote ? `<p>Note from the reviewer: "${trimmedNote}"</p>` : ""}
          <p style="margin-top:20px;font-size:12px;color:#666;">- The Ailexity Market Team</p>
        `,
      });
    } catch (err) {
      console.error("[Refund reject email]", err);
    }
  }, 0);

  return NextResponse.json({ success: true });
}
