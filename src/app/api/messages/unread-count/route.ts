import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/messages/unread-count — lightweight count for the navbar badge
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await prisma.directMessage.count({
    where: { recipientId: session.userId, read: false },
  });

  return NextResponse.json({ count });
}
