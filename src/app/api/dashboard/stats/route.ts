import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const channelId = searchParams.get("channelId");

  let targetSellerId = session.userId;
  if (session.role === "admin") {
    if (productId) {
      const product = await prisma.product.findUnique({ where: { id: productId }, select: { sellerId: true } });
      if (product) targetSellerId = product.sellerId;
    } else if (channelId) {
      const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { ownerId: true } });
      if (channel) targetSellerId = channel.ownerId;
    }
  }

  const purchaseWhere: { sellerId: string; productId?: string; channelId?: string; refunded: boolean } = {
    sellerId: targetSellerId,
    refunded: false,
  };
  if (productId) purchaseWhere.productId = productId;
  if (channelId) purchaseWhere.channelId = channelId;

  const [totalRevenue, totalSales, productsLive, customersCount] = await Promise.all([
    prisma.purchase.aggregate({
      where: purchaseWhere,
      _sum: { amount: true },
    }),
    prisma.purchase.count({ where: purchaseWhere }),
    prisma.product.count({
      where: { sellerId: session.userId, published: true, ...(productId ? { id: productId } : {}) },
    }),
    prisma.purchase.groupBy({
      by: ["buyerId"],
      where: purchaseWhere,
    }).then((groups) => groups.length),
  ]);

  return NextResponse.json({
    totalRevenue: totalRevenue._sum.amount ?? 0,
    totalSales,
    productsLive,
    customers: customersCount,
  });
}
