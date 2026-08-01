import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/messages — the caller's inbox: one row per person they've
// exchanged messages with, newest first, with the last message + unread count.
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await prisma.directMessage.findMany({
    where: { OR: [{ senderId: session.userId }, { recipientId: session.userId }] },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
      recipient: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const conversations = new Map<
    string,
    {
      user: { id: string; name: string; avatar: string | null };
      lastMessage: string;
      lastMessageAt: string;
      unreadCount: number;
    }
  >();

  for (const m of messages) {
    const isMine = m.senderId === session.userId;
    const counterpart = isMine ? m.recipient : m.sender;
    const existing = conversations.get(counterpart.id);
    if (!existing) {
      conversations.set(counterpart.id, {
        user: counterpart,
        lastMessage: m.content,
        lastMessageAt: m.createdAt.toISOString(),
        unreadCount: !isMine && !m.read ? 1 : 0,
      });
    } else if (!isMine && !m.read) {
      existing.unreadCount += 1;
    }
  }

  return NextResponse.json({ conversations: Array.from(conversations.values()) });
}
