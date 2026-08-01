import { prisma } from "@/lib/prisma";
import { getBusinessName } from "@/lib/business";
import { NextRequest, NextResponse } from "next/server";

// GET /api/invites/[token] — public info needed to render the accept page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    include: { owner: { select: { name: true } } },
  });
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: `This invite has already been ${invite.status}` }, { status: 410 });
  }

  const businessName = await getBusinessName(invite.businessType, invite.businessId);
  return NextResponse.json({
    businessType: invite.businessType,
    businessId: invite.businessId,
    businessName,
    ownerName: invite.owner.name,
  });
}
