import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET: Creator dashboard analytics for a community
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

    if (community.createrId !== session.userId) {
      return NextResponse.json(
        { error: "Only creator can access this dashboard" },
        { status: 403 }
      );
    }

    // Get stats
    const [
      totalMembers,
      activeSubscriptions,
      tiers,
      activeSubscriptionsDetail,
    ] = await Promise.all([
      prisma.communityMember.count({
        where: { communityId },
      }),
      prisma.communitySubscription.count({
        where: {
          communityId,
          status: "active",
        },
      }),
      prisma.subscriptionTier.findMany({
        where: { communityId },
        select: {
          id: true,
          name: true,
          price: true,
          interval: true,
        },
      }),
      prisma.communitySubscription.findMany({
        where: {
          communityId,
          status: "active",
        },
        select: {
          tierId: true,
        },
      }),
    ]);

    // Count subscriptions per tier
    const tierCounts = activeSubscriptionsDetail.reduce(
      (acc, sub) => {
        acc[sub.tierId] = (acc[sub.tierId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const tierStats = tiers.map((tier) => {
      const memberCount = tierCounts[tier.id] || 0;
      return {
        ...tier,
        memberCount,
        monthlyRevenue: memberCount * tier.price * 0.9, // 90% to creator
      };
    });

    // Get recent members
    const recentMembers = await prisma.communityMember.findMany({
      where: { communityId },
      take: 10,
      orderBy: { joinedAt: "desc" },
      include: {
        member: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
    });

    // Get churn/cancelled subscriptions
    const cancelledSubscriptions = await prisma.communitySubscription.count({
      where: {
        communityId,
        status: "cancelled",
      },
    });

    return NextResponse.json(
      {
        stats: {
          totalMembers,
          activeSubscriptions,
          cancelledCount: cancelledSubscriptions,
          churnRate: totalMembers > 0 ? cancelledSubscriptions / totalMembers : 0,
        },
        tiers: tierStats,
        recentMembers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Dashboard GET] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
