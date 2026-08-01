import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// GET: List all communities with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: Prisma.CommunityWhereInput = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where,
        skip,
        take: limit,
        include: {
          creator: {
            select: { id: true, name: true, username: true, avatar: true },
          },
          tiers: {
            select: { id: true, name: true, price: true, interval: true },
          },
          _count: {
            select: { members: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.community.count({ where }),
    ]);

    return NextResponse.json(
      {
        communities,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Communities GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch communities" },
      { status: 500 }
    );
  }
}

// POST: Create a new community
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, category, avatarUrl, coverImageUrl } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Community name is required" },
        { status: 400 }
      );
    }

    const community = await prisma.community.create({
      data: {
        name,
        description,
        category,
        avatarUrl,
        coverImageUrl,
        createrId: session.userId,
      },
      include: {
        creator: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        tiers: true,
      },
    });

    return NextResponse.json(community, { status: 201 });
  } catch (error) {
    console.error("[Communities POST]", error);
    return NextResponse.json(
      { error: "Failed to create community" },
      { status: 500 }
    );
  }
}
