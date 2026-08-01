import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/users/search?q= — public search over name/username/bio. Works
// logged-out too (just without the per-user "following" flag).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json([]);
  }

  const session = await getSession();

  const users = await prisma.user.findMany({
    where: {
      role: { not: "admin" },
      ...(session ? { id: { not: session.userId } } : {}),
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { bio: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      bio: true,
      _count: { select: { followers: true, products: true } },
    },
    orderBy: { followers: { _count: "desc" } },
    take: 20,
  });

  let followingSet = new Set<string>();
  if (session) {
    const followingIds = await prisma.follow.findMany({
      where: { followerId: session.userId },
      select: { followingId: true },
    });
    followingSet = new Set(followingIds.map((f) => f.followingId));
  }

  const result = users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    avatar: u.avatar,
    bio: u.bio,
    following: followingSet.has(u.id),
    followersCount: u._count.followers,
    productsCount: u._count.products,
  }));

  return NextResponse.json(result);
}
