import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/business/team/invite/[id] — revoke a pending invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const invite = await prisma.teamInvite.findUnique({ where: { id } });
  if (!invite) {
    return NextResponse.json({ success: true }, { status: 200 });
  }
  if (invite.ownerId !== session.userId) {
    return NextResponse.json({ error: "Only the owner can revoke this invite" }, { status: 403 });
  }

  await prisma.teamInvite.update({ where: { id }, data: { status: "revoked" } });
  return NextResponse.json({ success: true }, { status: 200 });
}
