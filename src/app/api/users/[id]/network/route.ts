import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const { id: profileId } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // "followers" | "following"

  if (type !== "followers" && type !== "following") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  let usersList;

  if (type === "followers") {
    const follows = await prisma.follow.findMany({
      where: { followingId: profileId },
      include: { follower: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });
    usersList = follows.map((f) => f.follower);
  } else {
    const follows = await prisma.follow.findMany({
      where: { followerId: profileId },
      include: { following: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });
    usersList = follows.map((f) => f.following);
  }

  let enrichedUsers = usersList.map((u) => ({ ...u, isFollowing: false }));

  if (session) {
    const userIds = usersList.map((u) => u.id);
    if (userIds.length > 0) {
      const viewerFollows = await prisma.follow.findMany({
        where: {
          followerId: session.userId,
          followingId: { in: userIds },
        },
        select: { followingId: true },
      });
      const followingSet = new Set(viewerFollows.map((f) => f.followingId));
      enrichedUsers = usersList.map((u) => ({
        ...u,
        isFollowing: followingSet.has(u.id),
      }));
    }
  }

  return NextResponse.json({ users: enrichedUsers });
}
