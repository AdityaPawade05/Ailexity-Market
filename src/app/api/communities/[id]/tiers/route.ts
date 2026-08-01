import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET: List tiers for a community
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tiers = await prisma.subscriptionTier.findMany({
      where: { communityId: id },
      orderBy: { price: "asc" },
    });

    return NextResponse.json(tiers, { status: 200 });
  } catch (error) {
    console.error("[Tiers GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch tiers" },
      { status: 500 }
    );
  }
}

// POST: Create a new tier
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: communityId } = await params;
    const community = await prisma.community.findUnique({
      where: { id: communityId },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    if (community.createrId !== session.userId) {
      return NextResponse.json(
        { error: "Only creator can create tiers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      price,
      interval,
      features,
      memberLimit,
      discordRoleId,
      telegramChannelId,
    } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 }
      );
    }

    const tier = await prisma.subscriptionTier.create({
      data: {
        name,
        description,
        price: Math.max(0, price),
        interval: interval || "month",
        features: features ? JSON.stringify(features) : null,
        memberLimit,
        discordRoleId: discordRoleId || null,
        telegramChannelId: telegramChannelId || null,
        communityId,
      },
    });

    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    console.error("[Tiers POST]", error);
    return NextResponse.json(
      { error: "Failed to create tier" },
      { status: 500 }
    );
  }
}
