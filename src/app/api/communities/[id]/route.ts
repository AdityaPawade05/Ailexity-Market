import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Tier `features` are persisted as a JSON string (or null). Normalize to a string[].
function parseFeatures(features: string | null): string[] {
  if (!features) return [];
  try {
    const parsed = JSON.parse(features);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// GET: Get community details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: communityId } = await params;

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        creator: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        tiers: {
          orderBy: { price: "asc" },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // `features` is stored as a JSON string; expose it as an array to clients.
    const response = {
      ...community,
      tiers: community.tiers.map((tier) => ({
        ...tier,
        features: parseFeatures(tier.features),
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[Community GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch community" },
      { status: 500 }
    );
  }
}

// PUT: Update community (creator only)
export async function PUT(
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
        { error: "Only creator can update this community" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, category, avatarUrl, coverImageUrl } = body;

    const updated = await prisma.community.update({
      where: { id: communityId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(coverImageUrl !== undefined && { coverImageUrl }),
      },
      include: {
        creator: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        tiers: true,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("[Community PUT]", error);
    return NextResponse.json(
      { error: "Failed to update community" },
      { status: 500 }
    );
  }
}

// DELETE: Delete community (creator only)
export async function DELETE(
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
        { error: "Only creator can delete this community" },
        { status: 403 }
      );
    }

    await prisma.community.delete({
      where: { id: communityId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Community DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete community" },
      { status: 500 }
    );
  }
}
