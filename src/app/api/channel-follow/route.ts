import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { channelId } = await request.json();
  if (!channelId) {
    return NextResponse.json(
      { error: "channelId is required" },
      { status: 400 }
    );
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const existing = await prisma.channelFollow.findUnique({
    where: {
      followerId_channelId: {
        followerId: session.userId,
        channelId,
      },
    },
  });

  if (existing) {
    await prisma.channelFollow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }

  await prisma.channelFollow.create({
    data: {
      followerId: session.userId,
      channelId,
    },
  });

  return NextResponse.json({ following: true });
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");
  if (!channelId) {
    return NextResponse.json(
      { error: "channelId is required" },
      { status: 400 }
    );
  }

  const existing = await prisma.channelFollow.findUnique({
    where: {
      followerId_channelId: {
        followerId: session.userId,
        channelId,
      },
    },
  });

  return NextResponse.json({ following: !!existing });
}
