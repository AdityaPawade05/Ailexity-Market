import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: session.userId },
      role: { not: "admin" },
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      bio: true,
      _count: {
        select: {
          followers: true,
          products: true,
        },
      },
    },
    orderBy: {
      followers: { _count: "desc" },
    },
    take: 10,
  });

  const followingIds = await prisma.follow.findMany({
    where: { followerId: session.userId },
    select: { followingId: true },
  });
  const followingSet = new Set(followingIds.map((f) => f.followingId));

  const result = users.map((u) => ({
    ...u,
    following: followingSet.has(u.id),
    followersCount: u._count.followers,
    productsCount: u._count.products,
  }));

  return NextResponse.json(result);
}
