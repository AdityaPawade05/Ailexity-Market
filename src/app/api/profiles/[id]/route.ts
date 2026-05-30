import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id: profileId } = await params;

  const profile = await prisma.user.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      name: true,
      role: true,
      avatar: true,
      coverImageUrl: true,
      bio: true,
      location: true,
      username: true,
      createdAt: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [earnedAgg, totalSales, followersCount, followingCount, channelsCount, postsCount] =
    await Promise.all([
      prisma.purchase.aggregate({
        where: { sellerId: profileId },
        _sum: { amount: true },
      }),
      prisma.purchase.count({ where: { sellerId: profileId } }),
      prisma.follow.count({ where: { followingId: profileId } }),
      prisma.follow.count({ where: { followerId: profileId } }),
      prisma.channel.count({ where: { ownerId: profileId } }),
      prisma.post.count({ where: { authorId: profileId } }),
    ]);

  const following =
    profileId === session.userId
      ? false
      : await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: session.userId,
              followingId: profileId,
            },
          },
          select: { id: true },
        });

  const products = await prisma.product.findMany({
    where: { sellerId: profileId, published: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { purchases: true } }, seller: { select: { id: true, name: true } } },
  });

  const ownedChannels = await prisma.channel.findMany({
    where: { ownerId: profileId },
    include: { owner: { select: { id: true, name: true, avatar: true } }, _count: { select: { channelFollows: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const joinedChannels = await prisma.channel.findMany({
    where: { channelFollows: { some: { followerId: profileId } } },
    include: { owner: { select: { id: true, name: true, avatar: true } }, _count: { select: { channelFollows: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const channelIds = [...ownedChannels, ...joinedChannels].map((c) => c.id);
  const viewerFollows =
    channelIds.length === 0
      ? []
      : await prisma.channelFollow.findMany({
          where: { followerId: session.userId, channelId: { in: channelIds } },
          select: { channelId: true },
        });

  const followingChannelSet = new Set(viewerFollows.map((f) => f.channelId));

  return NextResponse.json({
    profile,
    stats: {
      earned: earnedAgg._sum.amount ?? 0,
      totalSales,
      followersCount,
      followingCount,
      channelsCount,
      postsCount,
      joinedAt: profile.createdAt,
    },
    viewer: {
      following: !!following,
    },
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      type: p.type,
      imageUrl: p.imageUrl,
      published: p.published,
      purchasesCount: p._count.purchases,
      createdAt: p.createdAt,
      seller: p.seller,
    })),
    ownedChannels: ownedChannels.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      coverImageUrl: c.coverImageUrl,
      avatarUrl: c.avatarUrl,
      createdAt: c.createdAt,
      owner: c.owner,
      followersCount: c._count.channelFollows,
      following: followingChannelSet.has(c.id),
    })),
    joinedChannels: joinedChannels.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      coverImageUrl: c.coverImageUrl,
      avatarUrl: c.avatarUrl,
      createdAt: c.createdAt,
      owner: c.owner,
      followersCount: c._count.channelFollows,
      following: followingChannelSet.has(c.id),
    })),
  });
}

