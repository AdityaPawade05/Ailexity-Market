import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { validateTelegramBotConfig } from "@/lib/bot-integrations";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// GET: Get Telegram integration status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: communityId } = await params;
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { createrId: true },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    if (community.createrId !== session.userId) {
      return NextResponse.json(
        { error: "Only creator can view integrations" },
        { status: 403 }
      );
    }

    const integration = await prisma.telegramIntegration.findUnique({
      where: { communityId },
      select: {
        id: true,
        groupId: true,
        managedChannelId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      { integration, configured: !!integration },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Telegram GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch Telegram config" },
      { status: 500 }
    );
  }
}

// POST: Create or update Telegram integration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: communityId } = await params;
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { createrId: true },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    if (community.createrId !== session.userId) {
      return NextResponse.json(
        { error: "Only creator can configure integrations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { groupId, botToken, managedChannelId } = body;

    if (!groupId || !botToken) {
      return NextResponse.json(
        { error: "groupId and botToken are required" },
        { status: 400 }
      );
    }

    const validation = await validateTelegramBotConfig(botToken, groupId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const integration = await prisma.telegramIntegration.upsert({
      where: { communityId },
      create: {
        communityId,
        groupId,
        botToken: encrypt(botToken),
        managedChannelId,
      },
      update: {
        groupId,
        botToken: encrypt(botToken),
        managedChannelId,
      },
      select: {
        id: true,
        groupId: true,
        managedChannelId: true,
      },
    });

    return NextResponse.json(integration, { status: 200 });
  } catch (error) {
    console.error("[Telegram POST]", error);
    return NextResponse.json(
      { error: "Failed to configure Telegram integration" },
      { status: 500 }
    );
  }
}

// DELETE: Remove Telegram integration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: communityId } = await params;
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { createrId: true },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    if (community.createrId !== session.userId) {
      return NextResponse.json(
        { error: "Only creator can manage integrations" },
        { status: 403 }
      );
    }

    await prisma.telegramIntegration.delete({
      where: { communityId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // Ignore "not found" errors
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    console.error("[Telegram DELETE]", error);
    return NextResponse.json(
      { error: "Failed to remove Telegram integration" },
      { status: 500 }
    );
  }
}
