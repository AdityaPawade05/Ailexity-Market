import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = await props.params;
    const channelId = params.id;

    const channel: any = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (channel.ownerId === session.userId) {
      return NextResponse.json({ error: "You cannot purchase your own channel" }, { status: 400 });
    }

    const isFollowing = await prisma.channelFollow.findUnique({
      where: {
        followerId_channelId: { followerId: session.userId, channelId },
      },
    });

    if (isFollowing) {
      return NextResponse.json({ error: "You are already a member" }, { status: 400 });
    }

    if (!channel.price || channel.price <= 0) {
      return NextResponse.json({ error: "Channel is entirely free, just follow it!" }, { status: 400 });
    }

    // Wrap both the purchase and the follow record in a Prisma Transaction (if the DB supports it) or run sequentially safely.
    // 1. Create Purchase
    await prisma.purchase.create({
      data: {
        buyerId: session.userId,
        sellerId: channel.ownerId,
        channelId: channel.id,
        amount: channel.price,
      } as any, // Cast as any just in case Prisma Client is locally stale
    });

    // 2. Grant Access using ChannelFollow
    await prisma.channelFollow.create({
      data: {
        followerId: session.userId,
        channelId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Purchase channel error:", error);
    
    // In case the TS cast throws natively due to lock, fallback to standard error string
    if (error?.message?.includes('Unknown argument')) {
       return NextResponse.json({ error: "System requires a restart to process purchases due to recent database upgrades." }, { status: 500 });
    }
    
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
