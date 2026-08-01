import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, senderAddress } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

const BATCH_SIZE = 20;

// GET: the caller's past announcement sends
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await prisma.marketingEmailCampaign.findMany({
    where: { sellerId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ campaigns }, { status: 200 });
}

// POST: send an email announcement to every follower of the caller
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subject, message } = await request.json();
  if (!subject || typeof subject !== "string" || !message || typeof message !== "string") {
    return NextResponse.json({ error: "subject and message are required" }, { status: 400 });
  }

  const [seller, follows] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
    prisma.follow.findMany({
      where: { followingId: session.userId },
      select: { follower: { select: { email: true } } },
    }),
  ]);

  const recipients = follows.map((f) => f.follower.email);
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "You don't have any followers to send to yet" },
      { status: 400 }
    );
  }

  const campaign = await prisma.marketingEmailCampaign.create({
    data: {
      sellerId: session.userId,
      subject,
      message,
      recipientCount: recipients.length,
    },
  });

  const sellerName = seller?.name || "A creator you follow on Ailexity Market";
  const html = `<p>${message.replace(/\n/g, "<br/>")}</p><p style="color:#888;font-size:12px;margin-top:24px;">Sent by ${sellerName} via Ailexity Market</p>`;
  // Self-addressed To with recipients in bcc — must be a real mailbox address,
  // which SMTP_USER isn't for API-key-style providers (e.g. Resend's login is
  // the literal string "resend"), hence senderAddress() and not SMTP_USER.
  const fromAddress = senderAddress();

  // Fire-and-forget, batched via bcc so followers' addresses aren't exposed to
  // each other — same deferred style as purchase receipt emails in
  // /api/purchases. No queue library in this repo, so batches send sequentially.
  setTimeout(async () => {
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      try {
        await sendEmail({ to: fromAddress, bcc: batch, subject, html });
      } catch (err) {
        console.error("[MarketingEmailCampaign send]", err);
      }
    }
  }, 0);

  return NextResponse.json({ campaign, queued: true }, { status: 201 });
}
