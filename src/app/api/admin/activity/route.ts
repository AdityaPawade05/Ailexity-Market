import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [recentPurchases, recentPosts, recentUsers] = await Promise.all([
    prisma.purchase.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true } },
        product: { select: { title: true } },
        channel: { select: { name: true } },
      },
    }),
    prisma.post.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        channel: { select: { name: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.user.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      where: { role: { not: "admin" } },
      select: { id: true, name: true, email: true, avatar: true, createdAt: true },
    }),
  ]);

  const events = [
    ...recentPurchases.map((p) => ({
      type: "purchase" as const,
      id: p.id,
      createdAt: p.createdAt,
      label: `${p.buyer.name} purchased "${p.product?.title ?? p.channel?.name ?? "item"}" from ${p.seller.name}`,
      amount: p.amount,
      user: p.buyer,
    })),
    ...recentPosts.map((p) => ({
      type: "post" as const,
      id: p.id,
      createdAt: p.createdAt,
      label: `${p.author.name} posted in ${p.channel?.name ?? "feed"}`,
      content: p.content.slice(0, 80),
      user: p.author,
      likes: p._count.likes,
      comments: p._count.comments,
    })),
    ...recentUsers.map((u) => ({
      type: "signup" as const,
      id: u.id,
      createdAt: u.createdAt,
      label: `${u.name} joined`,
      user: { id: u.id, name: u.name, avatar: u.avatar },
      email: u.email,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(events);
}
