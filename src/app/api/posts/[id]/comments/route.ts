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

  let commentsWithAttachments = comments;
  try {
    if (comments.length > 0 && !('attachmentUrl' in comments[0])) {
      const rawComments: any[] = await prisma.$queryRawUnsafe(`SELECT "id", "attachmentUrl", "attachmentType" FROM "Comment" WHERE "postId" = ?`, id);
      const attachmentsMap = new Map(rawComments.map((c: any) => [c.id, { url: c.attachmentUrl, type: c.attachmentType }]));
      commentsWithAttachments = comments.map((c: any) => {
        const attach = attachmentsMap.get(c.id);
        return { ...c, attachmentUrl: attach?.url || null, attachmentType: attach?.type || null };
      }) as any;
    }
  } catch(e) {}

  return NextResponse.json(commentsWithAttachments);
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

  let comment;
  try {
    comment = await prisma.comment.create({
      data: {
        content: content?.trim() || "",
        attachmentUrl: attachmentUrl || null,
        attachmentType: attachmentType || null,
        userId: session.userId,
        postId,
      } as any,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });
  } catch (e: any) {
    if (e.message?.includes('Unknown argument')) {
      const fallbackId = "cm" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Comment" ("id", "content", "attachmentUrl", "attachmentType", "userId", "postId", "createdAt") VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        fallbackId, content?.trim() || "", attachmentUrl || null, attachmentType || null, session.userId, postId
      );
      comment = await prisma.comment.findUnique({
        where: { id: fallbackId },
        include: { user: { select: { id: true, name: true, avatar: true } } }
      });
    } else {
      throw e;
    }
  }

  return NextResponse.json(comment);
}
