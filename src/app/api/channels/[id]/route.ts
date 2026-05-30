import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const { id } = await params;

  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, avatar: true } },
      _count: { select: { channelFollows: true } },
    },
  });

  const members = await prisma.channelFollow.findMany({
    where: { channelId: id },
    include: {
      follower: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const followersCount = await prisma.channelFollow.count({
    where: { channelId: id },
  });

  const postsCount = await prisma.post.count({
    where: { channelId: id },
  });

  const following = await prisma.channelFollow.findUnique({
    where: {
      followerId_channelId: {
        followerId: session.userId,
        channelId: id,
      },
    },
    select: { id: true },
  });

  // Fetch price directly from DB in case Prisma Client is outdated
  let actualPrice = 0;
  try {
    if ('price' in channel) {
      actualPrice = (channel as any).price || 0;
    } else {
      const rawData: any[] = await prisma.$queryRawUnsafe(`SELECT price FROM "Channel" WHERE id = ?`, id);
      if (rawData && rawData.length > 0) {
        actualPrice = rawData[0].price || 0;
      }
    }
  } catch(e) {}

  return NextResponse.json({
    channel: {
      ...channel,
      price: actualPrice,
      followersCount,
      postsCount,
      members: members.map((item) => item.follower),
      isFollowing: !!following,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
  }

  try {
    // Check if channel exists and user is owner
    const channel = await prisma.channel.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (channel.ownerId !== session.userId) {
      return NextResponse.json(
        { error: "Unauthorized. Only owner can edit this community." },
        { status: 403 }
      );
    }

    const payload = await request.json();
    const updateData: Record<string, any> = {};

    if (payload.name !== undefined) {
      const trimmedName = String(payload.name).trim();
      if (!trimmedName) {
        return NextResponse.json({ error: "Channel name cannot be empty" }, { status: 400 });
      }
      updateData.name = trimmedName;
    }

    if (payload.description !== undefined) {
      updateData.description = payload.description ? String(payload.description).trim() : null;
    }

    if (payload.coverImageUrl !== undefined) {
      updateData.coverImageUrl = payload.coverImageUrl ? String(payload.coverImageUrl) : null;
    }

    if (payload.avatarUrl !== undefined) {
      updateData.avatarUrl = payload.avatarUrl ? String(payload.avatarUrl) : null;
    }

    if (payload.category !== undefined) {
      updateData.category = payload.category ? String(payload.category) : null;
    }

    if (payload.price !== undefined) {
      updateData.price = parseFloat(payload.price as string) || 0;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    let updatedChannel;
    try {
      updatedChannel = await prisma.channel.update({
        where: { id },
        data: updateData,
        include: {
          owner: { select: { id: true, name: true, avatar: true } },
        },
      });
    } catch (e: any) {
      if (e.message?.includes('Unknown argument')) {
        // Fallback for Windows Prisma EPERM Node-locks
        const setClauses: string[] = [];
        const values: any[] = [];
        for (const [key, value] of Object.entries(updateData)) {
          setClauses.push(`"${key}" = ?`);
          values.push(value !== undefined ? value : null);
        }
        setClauses.push(`"updatedAt" = CURRENT_TIMESTAMP`);
        values.push(id);
        
        await prisma.$executeRawUnsafe(
          `UPDATE "Channel" SET ${setClauses.join(", ")} WHERE "id" = ?`,
          ...values
        );
        
        updatedChannel = await prisma.channel.findUnique({
          where: { id },
          include: { owner: { select: { id: true, name: true, avatar: true } } }
        });
      } else {
        throw e;
      }
    }

    // Ensure price is injected for outdated clients
    if (updatedChannel && !('price' in updatedChannel)) {
      try {
        if (updateData.price !== undefined) {
          (updatedChannel as any).price = updateData.price;
        } else {
          const rawData: any[] = await prisma.$queryRawUnsafe(`SELECT price FROM "Channel" WHERE id = ?`, id);
          if (rawData && rawData.length > 0) {
            (updatedChannel as any).price = rawData[0].price || 0;
          }
        }
      } catch (e) {}
    }

    return NextResponse.json(updatedChannel);
  } catch (error) {
    console.error("Update channel error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Something went wrong: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Channel ID is required" }, { status: 400 });
  }

  try {
    const channel = await prisma.channel.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (channel.ownerId !== session.userId) {
      return NextResponse.json(
        { error: "Unauthorized. Only owner can delete this community." },
        { status: 403 }
      );
    }

    await prisma.channel.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete channel error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Something went wrong: ${errorMessage}` },
      { status: 500 }
    );
  }
}
