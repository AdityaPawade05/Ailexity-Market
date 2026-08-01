import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

const BUYER_REFUND_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// POST /api/purchases/[id]/refund-request — buyer asks for a refund. This
// doesn't move any money; it flags the purchase for the seller and every
// admin to review (both are notified), and either can approve it via
// POST /refund or decline it via POST /refund-reject.
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
      seller: { select: { email: true } },
    },
  });
  if (!purchase) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }
  if (purchase.buyerId !== session.userId) {
    return NextResponse.json({ error: "You can only request a refund on your own purchase" }, { status: 403 });
  }
  if (purchase.refunded) {
    return NextResponse.json({ error: "This purchase has already been refunded" }, { status: 400 });
  }
  if (purchase.refundRequestedAt) {
    return NextResponse.json({ error: "You already have a pending refund request for this purchase" }, { status: 400 });
  }

  const age = Date.now() - purchase.createdAt.getTime();
  if (age > BUYER_REFUND_WINDOW_MS) {
    return NextResponse.json(
      { error: "The 14-day refund request window for this purchase has passed. Contact the seller directly for help." },
      { status: 400 }
    );
  }

  const { reason } = await request.json().catch(() => ({ reason: undefined }));
  const trimmedReason = typeof reason === "string" && reason.trim() ? reason.trim() : null;
  const itemName = purchase.product?.title ?? purchase.channel?.name ?? "this item";

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: { refundRequestedAt: new Date(), refundReason: trimmedReason },
  });

  setTimeout(async () => {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { email: true } });
      const recipients = [purchase.seller.email, ...admins.map((a) => a.email)];

      const html = `
        <h2>Refund requested</h2>
        <p><strong>${purchase.buyer.name}</strong> requested a refund of $${purchase.amount.toFixed(2)} for <strong>${itemName}</strong>.</p>
        ${trimmedReason ? `<p>Reason: "${trimmedReason}"</p>` : ""}
        <br/>
        <a href="${appUrl}/business/payments" style="background:#f59e0b;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;font-weight:bold;">Review in Payments</a>
        <p style="margin-top:20px;font-size:12px;color:#666;">- The Ailexity Market Team</p>
      `;

      for (const to of recipients) {
        await sendEmail({ to, subject: `Refund requested: ${itemName}`, html });
      }
    } catch (err) {
      console.error("[Refund request email]", err);
    }
  }, 0);

  return NextResponse.json({ success: true });
}
