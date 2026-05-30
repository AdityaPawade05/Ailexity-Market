import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all"; // all | following

  if (filter === "following") {
    const following = await prisma.follow.findMany({
      where: { followerId: session.userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    followingIds.push(session.userId);

    const posts = await prisma.post.findMany({
      where: { authorId: { in: followingIds }, channelId: null },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, bio: true },
        },
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

  const posts = await prisma.post.findMany({
    where: { channelId: null }, // exclude channel-only posts from common feed
    include: {
      author: {
        select: { id: true, name: true, avatar: true, bio: true },
      },
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
