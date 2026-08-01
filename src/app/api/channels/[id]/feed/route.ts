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

  const { id } = await params;

  const channel = await prisma.channel.findUnique({
    where: { id },
    select: { ownerId: true, price: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Paid channels are members-only — don't leak posts to non-members.
  if (channel.price > 0 && channel.ownerId !== session.userId) {
    const isFollowing = await prisma.channelFollow.findUnique({
      where: { followerId_channelId: { followerId: session.userId, channelId: id } },
    });
    if (!isFollowing) {
      return NextResponse.json({ error: "You must join this community to view posts" }, { status: 403 });
    }
  }

  const posts = await prisma.post.findMany({
    where: { channelId: id },
    include: {
      author: { select: { id: true, name: true, avatar: true, bio: true } },
      _count: { select: { likes: true, comments: true } },
      likes: {
        where: { userId: session.userId },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    posts.map((p) => ({
      ...p,
      liked: p.likes.length > 0,
      likesCount: p._count.likes,
      commentsCount: p._count.comments,
    }))
  );
}
