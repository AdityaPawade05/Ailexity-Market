import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: List user's subscriptions
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptions = await prisma.communitySubscription.findMany({
      where: { memberId: session.userId },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            avatarUrl: true,
            category: true,
          },
        },
        tier: {
          select: { id: true, name: true, price: true, interval: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(subscriptions, { status: 200 });
  } catch (error) {
    console.error("[Subscriptions GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}
