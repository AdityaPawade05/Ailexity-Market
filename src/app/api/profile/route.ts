import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await (prisma.user as any).findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        coverImageUrl: true,
        bio: true,
        location: true,
        socialLinks: true,
        role: true,
        createdAt: true,
      }
    });

    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: session.userId } }),
      prisma.follow.count({ where: { followerId: session.userId } }),
    ]);

    return NextResponse.json({ user: { ...user, followersCount, followingCount } });
  } catch (error: any) {
    // Fallback for outdated Node.JS Prisma client cache lock in dev
    try {
      const users: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id", "name", "email", "avatar", "coverImageUrl", "bio", "location", "socialLinks", "role", "createdAt" FROM "User" WHERE "id" = ? LIMIT 1`, 
        session.userId
      );
      const [followersCount, followingCount] = await Promise.all([
        prisma.follow.count({ where: { followingId: session.userId } }),
        prisma.follow.count({ where: { followerId: session.userId } }),
      ]);
      const userObj = users[0] || null;
      if (userObj) {
        userObj.followersCount = followersCount;
        userObj.followingCount = followingCount;
      }
      return NextResponse.json({ user: userObj });
    } catch (e) {
      console.error("Profile GET fallback error:", e);
      return NextResponse.json({ error: "Internal DB error", user: null }, { status: 500 });
    }
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const payload = await request.json();
    const updateData: Record<string, string | null> = {};

    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.bio !== undefined) updateData.bio = payload.bio || null;
    if (payload.location !== undefined) updateData.location = payload.location || null;
    if (payload.avatar !== undefined) updateData.avatar = payload.avatar || null;
    if (payload.coverImageUrl !== undefined) updateData.coverImageUrl = payload.coverImageUrl || null;
    if (payload.socialLinks !== undefined) updateData.socialLinks = payload.socialLinks || null;

    let user;
    try {
      user = await (prisma.user as any).update({
        where: { id: session.userId },
        // @ts-ignore
        data: updateData,
        // @ts-ignore - Bypass stale Prisma types
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          coverImageUrl: true,
          bio: true,
          location: true,
          socialLinks: true,
          role: true,
          createdAt: true,
        }
      });
    } catch (prismaErr: any) {
      // Fallback for outdated Node.JS Prisma client cache lock in dev
      const sets: string[] = [];
      const values: any[] = [];
      for (const [k, v] of Object.entries(updateData)) {
        sets.push(`"${k}" = ?`);
        values.push(v);
      }
      
      if (sets.length > 0) {
        values.push(session.userId);
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET ${sets.join(", ")} WHERE "id" = ?`,
          ...values
        );
      }
      
      const users: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id", "name", "email", "avatar", "coverImageUrl", "bio", "location", "socialLinks", "role", "createdAt" FROM "User" WHERE "id" = ? LIMIT 1`, 
        session.userId
      );
      user = users[0] || null;
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
