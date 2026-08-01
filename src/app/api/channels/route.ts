import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parsePrice } from "@/lib/money";
import { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const { name, description, coverImageUrl, avatarUrl, category, price } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
    }

    const parsedPrice = price === undefined || price === null || price === "" ? 0 : parsePrice(price);
    if (parsedPrice === null) {
      return NextResponse.json({ error: "Price must be a non-negative number" }, { status: 400 });
    }

    const channel = await prisma.channel.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        coverImageUrl: coverImageUrl || null,
        avatarUrl: avatarUrl || null,
        category: category || null,
        price: parsedPrice,
        ownerId: session.userId,
      },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error("Create channel error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get("ownerId");
    const search = searchParams.get("search");
    const category = searchParams.get("category");

    const where: Prisma.ChannelWhereInput = {};
    if (ownerId) where.ownerId = ownerId;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const channels = await prisma.channel.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, avatar: true },
        },
        _count: { select: { channelFollows: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const withFollowersCount = channels.map((channel) => ({
      ...channel,
      followersCount: channel._count.channelFollows,
    }));

    return NextResponse.json(withFollowersCount);
  } catch (error) {
    console.error("Get channels error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
