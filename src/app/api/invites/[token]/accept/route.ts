import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// POST /api/invites/[token]/accept — join the team as the logged-in user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const invite = await prisma.teamInvite.findUnique({ where: { token } });
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: `This invite has already been ${invite.status}` }, { status: 410 });
  }

  if (invite.email) {
    const caller = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
    if (caller?.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invite was sent to a different email address" },
        { status: 403 }
      );
    }
  }

  try {
    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          businessType: invite.businessType,
          businessId: invite.businessId,
          userId: session.userId,
        },
      }),
      prisma.teamInvite.update({
        where: { id: invite.id },
        data: { status: "accepted", acceptedAt: new Date() },
      }),
    ]);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Already a member — still mark the invite accepted so it stops showing as pending.
      await prisma.teamInvite.update({ where: { id: invite.id }, data: { status: "accepted", acceptedAt: new Date() } });
    } else {
      console.error("[TeamInvite accept]", err);
      return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    businessType: invite.businessType,
    businessId: invite.businessId,
  });
}
