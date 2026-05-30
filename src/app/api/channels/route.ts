import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  if (!["admin", "seller", "buyer", "user"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { name, description, coverImageUrl, avatarUrl, category, price } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
    }

    let channel: any;
    try {
      channel = await prisma.channel.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          coverImageUrl: coverImageUrl || null,
          avatarUrl: avatarUrl || null,
          category: category || null,
          price: parseFloat(price) || 0,
          ownerId: session.userId,
        } as any,
        include: {
          owner: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });
    } catch (e: any) {
      if (e.message?.includes('Unknown argument')) {
        // Fallback for Windows Prisma EPERM Node-locks
        // Manually inject exactly into the SQLite schema bypassing the outdated Node.JS API Client cache
        const cuidFallback = "cm" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        await prisma.$executeRawUnsafe(
          `INSERT INTO "Channel" ("id", "name", "description", "coverImageUrl", "avatarUrl", "category", "price", "ownerId", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          cuidFallback, name.trim(), description?.trim() || null, coverImageUrl || null, avatarUrl || null, category || null, parseFloat(price) || 0, session.userId
        );
        channel = await prisma.channel.findUnique({
          where: { id: cuidFallback },
          include: { owner: { select: { id: true, name: true, avatar: true } } }
        });
      } else {
        throw e;
      }
    }
    
    // Ensure price is attached on return map
    if (channel && !('price' in channel)) {
      channel.price = parseFloat(price) || 0;
    }

    return NextResponse.json(channel);
  } catch (error) {
    console.error("Create channel error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');

    const channels = await prisma.channel.findMany({
      where: ownerId ? { ownerId } : undefined,
      include: {
        owner: {
          select: { id: true, name: true, avatar: true },
        },
        _count: { select: { channelFollows: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fallback for outdated Prisma client missing 'price' on GET
    let channelsWithPrice = channels;
    try {
      if (channels.length > 0 && !('price' in channels[0])) {
        const rawChannels: any[] = await prisma.$queryRawUnsafe(`SELECT id, price FROM "Channel"`);
        const priceMap = new Map(rawChannels.map((c: any) => [c.id, c.price]));
        channelsWithPrice = channels.map((c: any) => ({ ...c, price: priceMap.get(c.id) || 0 })) as any;
      }
    } catch(e) {}

    return NextResponse.json(channelsWithPrice);
  } catch (error) {
    console.error("Get channels error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
