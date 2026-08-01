import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Resolve whether the current session may read/post in a community's room.
// Allowed: the community creator, or a member with an active (non-expired)
// subscription. Returns the community name for convenience, or null if denied.
async function resolveRoomAccess(communityId: string, userId: string) {
  const [community, subscription] = await Promise.all([
    prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, name: true, createrId: true },
    }),
    prisma.communitySubscription.findUnique({
      where: { memberId_communityId: { memberId: userId, communityId } },
      select: { status: true, expiresAt: true },
    }),
  ]);

  if (!community) return { community: null, allowed: false };

  const isCreator = community.createrId === userId;
  const isActiveMember =
    subscription?.status === "active" &&
    (!subscription.expiresAt || subscription.expiresAt > new Date());

  return { community, allowed: isCreator || isActiveMember };
}

// GET /api/communities/[id]/room — recent messages in the community room.
// Supports ?after=<isoDate> to fetch only newer messages (used for polling).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: communityId } = await params;
    const { community, allowed } = await resolveRoomAccess(
      communityId,
      session.userId
    );

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    if (!allowed) {
      return NextResponse.json(
        { error: "An active subscription is required to access this room" },
        { status: 403 }
      );
    }

    const afterParam = request.nextUrl.searchParams.get("after");
    const after = afterParam ? new Date(afterParam) : null;

    const messages = await prisma.communityMessage.findMany({
      where: {
        communityId,
        ...(after && !isNaN(after.getTime())
          ? { createdAt: { gt: after } }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        id: true,
        content: true,
        createdAt: true,
        authorId: true,
        author: { select: { name: true, username: true, avatar: true } },
      },
    });

    return NextResponse.json(
      {
        community: { id: community.id, name: community.name },
        currentUserId: session.userId,
        messages,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Community room GET]", error);
    return NextResponse.json(
      { error: "Failed to load room" },
      { status: 500 }
    );
  }
}

// POST /api/communities/[id]/room — post a message to the community room.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: communityId } = await params;
    const { allowed, community } = await resolveRoomAccess(
      communityId,
      session.userId
    );

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }
    if (!allowed) {
      return NextResponse.json(
        { error: "An active subscription is required to post in this room" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }
    if (content.length > 2000) {
      return NextResponse.json(
        { error: "Message is too long (2000 characters max)" },
        { status: 400 }
      );
    }

    const message = await prisma.communityMessage.create({
      data: { communityId, authorId: session.userId, content },
      select: {
        id: true,
        content: true,
        createdAt: true,
        authorId: true,
        author: { select: { name: true, username: true, avatar: true } },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("[Community room POST]", error);
    return NextResponse.json(
      { error: "Failed to post message" },
      { status: 500 }
    );
  }
}
