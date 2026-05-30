import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id: channelId } = await params;
  const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { id: true, ownerId: true } });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  if (channel.ownerId !== session.userId) {
    const isFollowing = await prisma.channelFollow.findUnique({
      where: { followerId_channelId: { followerId: session.userId, channelId } },
    });
    if (!isFollowing) {
      return NextResponse.json({ error: "You must join this community to post" }, { status: 403 });
    }
  }

  const { content, imageUrl } = await request.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  try {
    const post = await prisma.post.create({
      data: {
        content: content.trim(),
        imageUrl: imageUrl || null,
        authorId: session.userId,
        channelId,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true, bio: true } },
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Create channel post error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

