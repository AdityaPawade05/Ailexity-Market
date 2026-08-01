import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [user, followersCount, followingCount] = await Promise.all([
      prisma.user.findUnique({
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
        },
      }),
      prisma.follow.count({ where: { followingId: session.userId } }),
      prisma.follow.count({ where: { followerId: session.userId } }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found", user: null }, { status: 404 });
    }

    return NextResponse.json({ user: { ...user, followersCount, followingCount } });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Internal DB error", user: null }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const payload = await request.json();
    const updateData: Record<string, string | null> = {};

    if (payload.name !== undefined) {
      const trimmedName = String(payload.name).trim();
      if (!trimmedName) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updateData.name = trimmedName;
    }
    if (payload.bio !== undefined) updateData.bio = payload.bio || null;
    if (payload.location !== undefined) updateData.location = payload.location || null;
    if (payload.avatar !== undefined) updateData.avatar = payload.avatar || null;
    if (payload.coverImageUrl !== undefined) updateData.coverImageUrl = payload.coverImageUrl || null;
    if (payload.socialLinks !== undefined) updateData.socialLinks = payload.socialLinks || null;

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
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
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
