import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { validateDiscordBotConfig } from "@/lib/bot-integrations";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// GET: Get Discord integration status
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

    const integration = await prisma.discordIntegration.findUnique({
      where: { communityId },
      select: {
        id: true,
        serverId: true,
        managedRoleId: true,
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
    console.error("[Discord GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch Discord config" },
      { status: 500 }
    );
  }
}

// POST: Create or update Discord integration
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
    const { serverId, botToken, managedRoleId, managedChannelId } = body;

    if (!serverId || !botToken) {
      return NextResponse.json(
        { error: "serverId and botToken are required" },
        { status: 400 }
      );
    }

    const validation = await validateDiscordBotConfig(botToken, serverId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const integration = await prisma.discordIntegration.upsert({
      where: { communityId },
      create: {
        communityId,
        serverId,
        botToken: encrypt(botToken),
        managedRoleId,
        managedChannelId,
      },
      update: {
        serverId,
        botToken: encrypt(botToken),
        managedRoleId,
        managedChannelId,
      },
      select: {
        id: true,
        serverId: true,
        managedRoleId: true,
        managedChannelId: true,
      },
    });

    return NextResponse.json(integration, { status: 200 });
  } catch (error) {
    console.error("[Discord POST]", error);
    return NextResponse.json(
      { error: "Failed to configure Discord integration" },
      { status: 500 }
    );
  }
}

// DELETE: Remove Discord integration
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

    await prisma.discordIntegration.delete({
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

    console.error("[Discord DELETE]", error);
    return NextResponse.json(
      { error: "Failed to remove Discord integration" },
      { status: 500 }
    );
  }
}
