import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveBusinessOwner, getBusinessName } from "@/lib/business";
import { sendEmail } from "@/lib/email";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

// POST /api/business/team/invite — create an invite for a product/community
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, id, email } = await request.json();
  if (!type || !id) {
    return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
  }

  const ownerId = await resolveBusinessOwner(type, id);
  if (!ownerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (ownerId !== session.userId) {
    return NextResponse.json({ error: "Only the owner can invite team members" }, { status: 403 });
  }

  const invite = await prisma.teamInvite.create({
    data: {
      ownerId: session.userId,
      businessType: type,
      businessId: id,
      email: email && typeof email === "string" && email.trim() ? email.trim() : null,
      token: randomBytes(16).toString("hex"),
    },
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/invite/${invite.token}`;

  if (invite.email) {
    const businessName = await getBusinessName(type, id);
    const owner = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
    const html = `<p>${owner?.name || "Someone"} invited you to join the team for <strong>${businessName || "their business"}</strong> on Ailexity Market.</p><p><a href="${inviteUrl}">Accept the invite</a></p>`;
    try {
      await sendEmail({ to: invite.email, subject: "You've been invited to join a team on Ailexity Market", html });
    } catch (err) {
      console.error("[TeamInvite email]", err);
    }
  }

  return NextResponse.json({ invite, inviteUrl }, { status: 201 });
}
