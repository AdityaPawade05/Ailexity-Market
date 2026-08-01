import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/messages/[userId] — the thread with one specific user. Supports
// ?after=<ISO date> for delta polling (same pattern as the community room).
// Opening/polling the thread marks the counterpart's messages as read.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId: otherId } = await params;
  const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true, name: true, avatar: true } });
  if (!other) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after");

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: session.userId, recipientId: otherId },
        { senderId: otherId, recipientId: session.userId },
      ],
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  await prisma.directMessage.updateMany({
    where: { senderId: otherId, recipientId: session.userId, read: false },
    data: { read: true },
  });

  return NextResponse.json({ otherUser: other, currentUserId: session.userId, messages });
}

// POST /api/messages/[userId] — send a message to that user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId: otherId } = await params;
  if (otherId === session.userId) {
    return NextResponse.json({ error: "You can't message yourself" }, { status: 400 });
  }

  const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true } });
  if (!other) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { content } = await request.json();
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
  }
  if (content.trim().length > 2000) {
    return NextResponse.json({ error: "Message is too long (max 2000 characters)" }, { status: 400 });
  }

  const message = await prisma.directMessage.create({
    data: { senderId: session.userId, recipientId: otherId, content: content.trim() },
  });

  return NextResponse.json({ message }, { status: 201 });
}
