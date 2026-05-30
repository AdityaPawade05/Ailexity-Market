import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!type || !id) {
    return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
  }

  try {
    if (type === "community") {
      const channel = await prisma.channel.findUnique({
        where: { id },
      });
      if (!channel || channel.ownerId !== session.userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      
      return NextResponse.json({
        business: {
          id: channel.id,
          name: channel.name,
          bio: channel.description || "",
          avatar: channel.avatarUrl || "",
          coverImageUrl: channel.coverImageUrl || "",
          location: "",
          socialLinks: "",
        }
      });
    } else if (type === "product") {
      const product = await prisma.product.findUnique({
        where: { id },
      });
      if (!product || product.sellerId !== session.userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json({
        business: {
          id: product.id,
          name: product.title,
          bio: product.description || "",
          avatar: product.imageUrl || "",
          coverImageUrl: "", // Products usually don't have a giant cover image yet
          location: "",
          socialLinks: "",
        }
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Fetch business error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!type || !id) {
    return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, bio, avatar, coverImageUrl } = body;

    // We don't save location or socialLinks here because they are not on the schema yet.

    if (type === "community") {
      const channel = await prisma.channel.findUnique({ where: { id } });
      if (!channel || channel.ownerId !== session.userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await prisma.channel.update({
        where: { id },
        data: {
          name: name !== undefined ? name : channel.name,
          description: bio !== undefined ? bio : channel.description,
          avatarUrl: avatar !== undefined ? avatar : channel.avatarUrl,
          coverImageUrl: coverImageUrl !== undefined ? coverImageUrl : channel.coverImageUrl,
        }
      });
      return NextResponse.json({ success: true });
    } else if (type === "product") {
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product || product.sellerId !== session.userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await prisma.product.update({
        where: { id },
        data: {
          title: name !== undefined ? name : product.title,
          description: bio !== undefined ? bio : product.description,
          imageUrl: avatar !== undefined ? avatar : product.imageUrl,
          // Since Products don't have coverImageUrl in DB yet, we just ignore it.
        }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  } catch (error) {
    console.error("Patch business error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
