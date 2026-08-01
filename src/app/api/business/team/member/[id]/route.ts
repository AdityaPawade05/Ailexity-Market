import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveBusinessOwner } from "@/lib/business";
import { NextRequest, NextResponse } from "next/server";

// DELETE /api/business/team/member/[id] — remove a team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const member = await prisma.teamMember.findUnique({ where: { id } });
  if (!member) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const ownerId = await resolveBusinessOwner(member.businessType, member.businessId);
  if (ownerId !== session.userId) {
    return NextResponse.json({ error: "Only the owner can remove team members" }, { status: 403 });
  }

  await prisma.teamMember.delete({ where: { id } });
  return NextResponse.json({ success: true }, { status: 200 });
}
