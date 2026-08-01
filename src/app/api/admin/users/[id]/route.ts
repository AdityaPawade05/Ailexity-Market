import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      username: true,
      bio: true,
      location: true,
      banned: true,
      createdAt: true,
      updatedAt: true,
      products: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, price: true, type: true, published: true, createdAt: true, _count: { select: { purchases: true } } },
      },
      purchases: {
        take: 20,
        orderBy: { createdAt: "desc" },
        select: { id: true, amount: true, createdAt: true, product: { select: { title: true } }, seller: { select: { name: true } } },
      },
      sales: {
        take: 20,
        orderBy: { createdAt: "desc" },
        select: { id: true, amount: true, createdAt: true, product: { select: { title: true } }, buyer: { select: { name: true, email: true } } },
      },
      posts: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: { id: true, content: true, createdAt: true, _count: { select: { likes: true, comments: true } } },
      },
      channels: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, category: true, price: true, createdAt: true, _count: { select: { channelFollows: true, posts: true } } },
      },
      _count: {
        select: {
          products: true,
          purchases: true,
          sales: true,
          posts: true,
          comments: true,
          likes: true,
          channels: true,
          followers: true,
          following: true,
          channelFollows: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const totalRevenue = await prisma.purchase.aggregate({
    where: { sellerId: id },
    _sum: { amount: true },
  });

  return NextResponse.json({ ...user, totalRevenue: totalRevenue._sum.amount ?? 0 });
}

// PATCH /api/admin/users/[id] — ban or unban a user
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { banned } = await request.json();
  if (typeof banned !== "boolean") {
    return NextResponse.json({ error: "banned must be a boolean" }, { status: 400 });
  }

  if (id === session.userId) {
    return NextResponse.json({ error: "You can't ban your own account" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.role === "admin" && banned) {
    return NextResponse.json({ error: "Admins can't be banned" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { banned },
    select: { id: true, banned: true },
  });

  return NextResponse.json(updated);
}
