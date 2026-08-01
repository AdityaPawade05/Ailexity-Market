import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const imageUrl = typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;
    const attachmentUrl =
      typeof body.attachmentUrl === "string" && body.attachmentUrl.trim() ? body.attachmentUrl.trim() : null;
    // Only videos are allowed as feed post attachments for now.
    const attachmentType = attachmentUrl ? "video" : null;

    // Like Facebook: a photo or video post doesn't need a caption,
    // but an empty post isn't allowed.
    if (!content && !imageUrl && !attachmentUrl) {
      return NextResponse.json(
        { error: "Add some text, a photo, or a video to post" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        content,
        imageUrl,
        attachmentUrl,
        attachmentType,
        authorId: session.userId,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, bio: true },
        },
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
