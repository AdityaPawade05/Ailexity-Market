import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/reports/earnings?year=2026 — the caller's seller earnings summary,
// bucketed by calendar month. Refunded sales are reported both ways: inside
// the month's gross (money that did move) and in a separate refunded column,
// with commission/net counting only sales that stayed paid — the numbers a
// seller actually needs when filing taxes.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const yearParam = Number(searchParams.get("year"));
  const year = Number.isInteger(yearParam) && yearParam >= 2020 && yearParam <= 2100
    ? yearParam
    : new Date().getUTCFullYear();

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const purchases = await prisma.purchase.findMany({
    where: { sellerId: session.userId, createdAt: { gte: start, lt: end } },
    select: {
      amount: true,
      commissionAmount: true,
      sellerEarning: true,
      refunded: true,
      createdAt: true,
    },
  });

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    gross: 0,
    refunded: 0,
    commission: 0,
    net: 0,
    salesCount: 0,
    refundCount: 0,
  }));

  for (const p of purchases) {
    const bucket = months[p.createdAt.getUTCMonth()];
    bucket.gross += p.amount;
    bucket.salesCount += 1;
    if (p.refunded) {
      bucket.refunded += p.amount;
      bucket.refundCount += 1;
    } else {
      bucket.commission += p.commissionAmount;
      bucket.net += p.sellerEarning;
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  for (const m of months) {
    m.gross = round(m.gross);
    m.refunded = round(m.refunded);
    m.commission = round(m.commission);
    m.net = round(m.net);
  }

  const totals = months.reduce(
    (acc, m) => ({
      gross: round(acc.gross + m.gross),
      refunded: round(acc.refunded + m.refunded),
      commission: round(acc.commission + m.commission),
      net: round(acc.net + m.net),
      salesCount: acc.salesCount + m.salesCount,
      refundCount: acc.refundCount + m.refundCount,
    }),
    { gross: 0, refunded: 0, commission: 0, net: 0, salesCount: 0, refundCount: 0 }
  );

  return NextResponse.json({ year, months, totals });
}
