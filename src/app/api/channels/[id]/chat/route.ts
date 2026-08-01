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

  // Paid channels are members-only — don't leak chat to non-members.
  if (channel.price > 0 && channel.ownerId !== session.userId) {
    const isFollowing = await prisma.channelFollow.findUnique({
      where: { followerId_channelId: { followerId: session.userId, channelId: id } },
    });
    if (!isFollowing) {
      return NextResponse.json({ error: "You must join this community to view the chat" }, { status: 403 });
    }
  }

  const messages = await prisma.post.findMany({
    where: { channelId: id },
    include: {
      author: { select: { id: true, name: true, avatar: true, bio: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json(
    messages.map((m) => ({
      id: m.id,
      content: m.content,
      imageUrl: m.imageUrl,
      attachmentUrl: m.attachmentUrl,
      attachmentType: m.attachmentType,
      author: m.author,
      createdAt: m.createdAt,
    }))
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id } = await params;
  const data = await request.json();
  const content = String(data.content || "").trim();
  const attachmentUrl = data.attachmentUrl ? String(data.attachmentUrl).trim() : null;
  const attachmentType = data.attachmentType ? String(data.attachmentType).trim() : null;

  if (!content && !attachmentUrl) {
    return NextResponse.json({ error: "Message content or attachment is required" }, { status: 400 });
  }

  const channel = await prisma.channel.findUnique({ where: { id }, select: { id: true, ownerId: true } });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  if (channel.ownerId !== session.userId) {
    const isFollowing = await prisma.channelFollow.findUnique({
      where: { followerId_channelId: { followerId: session.userId, channelId: id } },
    });
    if (!isFollowing) {
      return NextResponse.json({ error: "You must join this community to chat" }, { status: 403 });
    }
  }

  const message = await prisma.post.create({
    data: {
      content: content || "",
      imageUrl: null,
      attachmentUrl: attachmentUrl || null,
      attachmentType: attachmentType || null,
      authorId: session.userId,
      channelId: id,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true, bio: true } },
    },
  });

  return NextResponse.json({
    id: message.id,
    content: message.content,
    imageUrl: message.imageUrl,
    attachmentUrl: message.attachmentUrl,
    attachmentType: message.attachmentType,
    author: message.author,
    createdAt: message.createdAt,
  });
}
