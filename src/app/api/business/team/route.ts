import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveBusinessOwner } from "@/lib/business";
import { NextRequest, NextResponse } from "next/server";

// GET /api/business/team?type=&id= — owner + real team members + pending invites
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const businessType = searchParams.get("type");
  const businessId = searchParams.get("id");
  if (!businessType || !businessId) {
    return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
  }

  const ownerId = await resolveBusinessOwner(businessType, businessId);
  if (!ownerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (ownerId !== session.userId) {
    return NextResponse.json({ error: "Only the owner can view the team" }, { status: 403 });
  }

  const [owner, members, invites] = await Promise.all([
    prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, name: true, email: true, avatar: true } }),
    prisma.teamMember.findMany({
      where: { businessType, businessId },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.teamInvite.findMany({
      where: { businessType, businessId, status: "pending" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ owner, members, invites });
}
