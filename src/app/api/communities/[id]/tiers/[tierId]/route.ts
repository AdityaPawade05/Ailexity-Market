import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PUT: Update tier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tierId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tierId } = await params;
    const tier = await prisma.subscriptionTier.findUnique({
      where: { id: tierId },
      include: { community: true },
    });

    if (!tier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    if (tier.community.createrId !== session.userId) {
      return NextResponse.json(
        { error: "Only creator can update this tier" },
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

    const updated = await prisma.subscriptionTier.update({
      where: { id: tierId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Math.max(0, price) }),
        ...(interval && { interval }),
        ...(features !== undefined && { features: JSON.stringify(features) }),
        ...(memberLimit !== undefined && { memberLimit }),
        ...(discordRoleId !== undefined && { discordRoleId: discordRoleId || null }),
        ...(telegramChannelId !== undefined && {
          telegramChannelId: telegramChannelId || null,
        }),
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("[Tier PUT]", error);
    return NextResponse.json(
      { error: "Failed to update tier" },
      { status: 500 }
    );
  }
}

// DELETE: Delete tier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tierId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tierId } = await params;
    const tier = await prisma.subscriptionTier.findUnique({
      where: { id: tierId },
      include: { community: true },
    });

    if (!tier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    if (tier.community.createrId !== session.userId) {
      return NextResponse.json(
        { error: "Only creator can delete this tier" },
        { status: 403 }
      );
    }

    // Can't delete tier if there are active subscriptions
    const activeSubscriptions = await prisma.communitySubscription.count({
      where: {
        tierId: tierId,
        status: "active",
      },
    });

    if (activeSubscriptions > 0) {
      return NextResponse.json(
        { error: "Cannot delete tier with active subscriptions" },
        { status: 400 }
      );
    }

    await prisma.subscriptionTier.delete({
      where: { id: tierId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Tier DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete tier" },
      { status: 500 }
    );
  }
}
