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
    // Location and social links are inherently seller-level (a person's info,
    // not one product/community's), so they're read from the caller's own
    // User row rather than the Product/Channel — same fields /api/profile uses.
    const owner = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { location: true, socialLinks: true },
    });

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
          location: owner?.location || "",
          socialLinks: owner?.socialLinks || "",
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
          location: owner?.location || "",
          socialLinks: owner?.socialLinks || "",
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
    const { name, bio, avatar, coverImageUrl, location, socialLinks } = body;

    // Location and social links live on the seller's User row, shared across
    // all of that seller's products/communities (see GET above).
    if (location !== undefined || socialLinks !== undefined) {
      await prisma.user.update({
        where: { id: session.userId },
        data: {
          ...(location !== undefined ? { location } : {}),
          ...(socialLinks !== undefined ? { socialLinks } : {}),
        },
      });
    }

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
