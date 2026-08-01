import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET: List community members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: communityId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const skip = (page - 1) * limit;

    // Verify creator
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { createrId: true },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Allow creator to see all members, or user to see themselves
    if (community.createrId !== session.userId && true) {
      // For now, only creators can list members
      return NextResponse.json(
        { error: "Only creator can view members" },
        { status: 403 }
      );
    }

    const where = {
      communityId,
      ...(search
        ? {
            member: {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { username: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
              ],
            },
          }
        : {}),
    };

    const [members, total] = await Promise.all([
      prisma.communityMember.findMany({
        where,
        skip,
        take: limit,
        include: {
          member: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              email: true,
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      }),
      prisma.communityMember.count({ where }),
    ]);

    // Get subscription info for each member
    const memberIds = members.map((m) => m.member.id);
    const subscriptions = await prisma.communitySubscription.findMany({
      where: {
        communityId,
        memberId: { in: memberIds },
      },
      include: {
        tier: {
          select: { id: true, name: true, price: true },
        },
      },
    });

    const subscriptionMap = new Map(
      subscriptions.map((s) => [s.memberId, s])
    );

    const enrichedMembers = members.map((m) => ({
      ...m,
      subscription: subscriptionMap.get(m.member.id),
    }));

    return NextResponse.json(
      {
        members: enrichedMembers,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Members GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
