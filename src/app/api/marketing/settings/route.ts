import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const AUDIENCE_PRESETS = ["All buyers", "Repeat buyers", "New visitors", "High intent"];

// GET /api/marketing/settings — the caller's marketing preferences (creates
// a default row if it doesn't exist yet, same lazy-create pattern as Wallet)
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let settings = await prisma.marketingSettings.findUnique({ where: { sellerId: session.userId } });
  if (!settings) {
    settings = await prisma.marketingSettings.create({ data: { sellerId: session.userId } });
  }

  return NextResponse.json(settings);
}

// PATCH: update audience preset and/or ad platform connections
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const data: {
    audiencePreset?: string;
    facebookConnected?: boolean;
    googleConnected?: boolean;
    instagramConnected?: boolean;
  } = {};

  if (body.audiencePreset !== undefined) {
    if (!AUDIENCE_PRESETS.includes(body.audiencePreset)) {
      return NextResponse.json({ error: "Invalid audience preset" }, { status: 400 });
    }
    data.audiencePreset = body.audiencePreset;
  }
  if (body.facebookConnected !== undefined) data.facebookConnected = Boolean(body.facebookConnected);
  if (body.googleConnected !== undefined) data.googleConnected = Boolean(body.googleConnected);
  if (body.instagramConnected !== undefined) data.instagramConnected = Boolean(body.instagramConnected);

  const settings = await prisma.marketingSettings.upsert({
    where: { sellerId: session.userId },
    create: { sellerId: session.userId, ...data },
    update: data,
  });

  return NextResponse.json(settings);
}
