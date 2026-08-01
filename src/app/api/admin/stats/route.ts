import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    usersCount,
    newUsersThisWeek,
    productsCount,
    publishedProductsCount,
    purchasesCount,
    totalRevenue,
    postsCount,
    channelsCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: { not: "admin" } } }),
    prisma.user.count({ where: { role: { not: "admin" }, createdAt: { gte: weekAgo } } }),
    prisma.product.count(),
    prisma.product.count({ where: { published: true } }),
    prisma.purchase.count(),
    prisma.purchase.aggregate({ _sum: { amount: true } }),
    prisma.post.count(),
    prisma.channel.count(),
  ]);

  return NextResponse.json({
    usersCount,
    newUsersThisWeek,
    productsCount,
    publishedProductsCount,
    purchasesCount,
    totalRevenue: totalRevenue._sum.amount ?? 0,
    postsCount,
    channelsCount,
  });
}
