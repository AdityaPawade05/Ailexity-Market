import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [usersCount, productsCount, purchasesCount, totalRevenue] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.purchase.count(),
    prisma.purchase.aggregate({ _sum: { amount: true } }),
  ]);

  const buyersCount = await prisma.user.count({ where: { role: "buyer" } });
  const sellersCount = await prisma.user.count({ where: { role: "seller" } });

  return NextResponse.json({
    usersCount,
    productsCount,
    purchasesCount,
    totalRevenue: totalRevenue._sum.amount ?? 0,
    buyersCount,
    sellersCount,
  });
}
