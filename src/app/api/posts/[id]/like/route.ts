import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id: postId } = await params;
  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const existing = await prisma.like.findUnique({
    where: {
      userId_postId: { userId: session.userId, postId },
    },
  });

  if (existing) {
    await prisma.like.delete({
      where: { id: existing.id },
    });
    const count = await prisma.like.count({ where: { postId } });
    return NextResponse.json({ liked: false, count });
  }

  try {
    await prisma.like.create({
      data: { userId: session.userId, postId },
    });
  } catch (error: any) {
    // Ignore unique constraint violation (P2002) due to race condition
    if (error.code !== "P2002") {
      return NextResponse.json({ error: "Failed to like post" }, { status: 500 });
    }
  }

  const count = await prisma.like.count({ where: { postId } });
  return NextResponse.json({ liked: true, count });
}
