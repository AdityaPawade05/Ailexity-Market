import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id } = await params;
  const comments = await prisma.comment.findMany({
    where: { postId: id },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id: postId } = await params;
  const { content, attachmentUrl, attachmentType } = await request.json();

  if (!content?.trim() && !attachmentUrl) {
    return NextResponse.json(
      { error: "Comment content or attachment is required" },
      { status: 400 }
    );
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: {
      content: content?.trim() || "",
      attachmentUrl: attachmentUrl || null,
      attachmentType: attachmentType || null,
      userId: session.userId,
      postId,
    },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  });

  return NextResponse.json(comment);
}
