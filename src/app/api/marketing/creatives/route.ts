import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET: list the caller's creative assets
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creatives = await prisma.marketingCreative.findMany({
    where: { sellerId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ creatives }, { status: 200 });
}

// POST: add a creative asset
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, assetUrl } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const created = await prisma.marketingCreative.create({
    data: {
      sellerId: session.userId,
      name: name.trim(),
      assetUrl: assetUrl && typeof assetUrl === "string" && assetUrl.trim() ? assetUrl.trim() : null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
