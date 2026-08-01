import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function summarize(purchases: { amount: number; buyerId: string }[]) {
  return {
    totalRevenue: purchases.reduce((sum, p) => sum + p.amount, 0),
    totalSales: purchases.length,
    customers: new Set(purchases.map((p) => p.buyerId)).size,
  };
}

// GET /api/dashboard/analytics — time-series revenue/sales for the products dashboard
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const channelId = searchParams.get("channelId");
  const range = searchParams.get("range") || "7d";
  const days = RANGE_DAYS[range] ?? 7;

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

  const currentEnd = new Date();
  const currentStart = new Date(currentEnd);
  currentStart.setUTCDate(currentStart.getUTCDate() - days);
  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);
  const previousEnd = currentStart;

  const purchaseWhere: { sellerId: string; productId?: string; channelId?: string; refunded: boolean } = {
    sellerId: targetSellerId,
    refunded: false,
  };
  if (productId) purchaseWhere.productId = productId;
  if (channelId) purchaseWhere.channelId = channelId;

  const [currentPurchases, previousPurchases, productsLive, wallet, payoutAgg] = await Promise.all([
    prisma.purchase.findMany({
      where: { ...purchaseWhere, createdAt: { gte: currentStart, lte: currentEnd } },
      select: { amount: true, buyerId: true, createdAt: true },
    }),
    prisma.purchase.findMany({
      where: { ...purchaseWhere, createdAt: { gte: previousStart, lt: previousEnd } },
      select: { amount: true, buyerId: true },
    }),
    prisma.product.count({
      where: { sellerId: session.userId, published: true, ...(productId ? { id: productId } : {}) },
    }),
    prisma.wallet.findUnique({ where: { userId: targetSellerId }, select: { balance: true } }),
    prisma.walletTransaction.aggregate({
      where: { type: "WITHDRAWAL", wallet: { userId: targetSellerId } },
      _sum: { amount: true },
    }),
  ]);

  // Bucket by calendar day — use whole-day boundaries so a purchase timestamped
  // anywhere between currentStart and currentEnd always lands in a bucket
  // (currentStart/currentEnd are exact instants, not midnight-aligned).
  const startDay = new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth(), currentStart.getUTCDate()));
  const endDay = new Date(Date.UTC(currentEnd.getUTCFullYear(), currentEnd.getUTCMonth(), currentEnd.getUTCDate()));
  const buckets = new Map<string, { revenue: number; sales: number }>();
  for (const d = new Date(startDay); d <= endDay; d.setUTCDate(d.getUTCDate() + 1)) {
    buckets.set(dayKey(d), { revenue: 0, sales: 0 });
  }
  for (const p of currentPurchases) {
    const bucket = buckets.get(dayKey(p.createdAt));
    if (bucket) {
      bucket.revenue += p.amount;
      bucket.sales += 1;
    }
  }
  const series = Array.from(buckets, ([date, v]) => ({ date, ...v }));

  return NextResponse.json({
    range,
    current: { start: currentStart.toISOString(), end: currentEnd.toISOString(), ...summarize(currentPurchases) },
    previous: { start: previousStart.toISOString(), end: previousEnd.toISOString(), ...summarize(previousPurchases) },
    series,
    productsLive,
    walletBalance: wallet?.balance ?? 0,
    payoutsTotal: payoutAgg._sum.amount ?? 0,
  });
}
