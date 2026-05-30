import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") || "created"; // created | joined
  const { id: profileId } = await params;

  const baseWhere =
    kind === "joined"
      ? {
          channelFollows: {
            some: { followerId: profileId },
          },
        }
      : { ownerId: profileId };

  const channels = await prisma.channel.findMany({
    where: baseWhere,
    include: {
      owner: { select: { id: true, name: true, avatar: true } },
      _count: { select: { channelFollows: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const ids = channels.map((c) => c.id);
  const viewerFollows =
    ids.length === 0
      ? []
      : await prisma.channelFollow.findMany({
          where: { followerId: session.userId, channelId: { in: ids } },
          select: { channelId: true },
        });

  const followingSet = new Set(viewerFollows.map((f) => f.channelId));

  return NextResponse.json(
    channels.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      coverImageUrl: c.coverImageUrl,
      avatarUrl: c.avatarUrl,
      createdAt: c.createdAt,
      owner: c.owner,
      followersCount: c._count.channelFollows,
      following: followingSet.has(c.id),
      postsCount: null,
    }))
  );
}

