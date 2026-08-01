import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// GET /api/admin/platform-wallet — admin-only: view Ailexity commission balance
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const platformWallet = await prisma.platformWallet.upsert({
    where: { id: "platform" },
    update: {},
    create: { id: "platform", balance: 0 },
  });

  // Also compute commission totals from purchase records for verification
  const totals = await prisma.purchase.aggregate({
    _sum: { commissionAmount: true, amount: true, sellerEarning: true },
    _count: true,
  });

  // Top sellers by earnings
  const sellerGroups = await prisma.purchase.groupBy({
    by: ["sellerId"],
    _sum: { sellerEarning: true, commissionAmount: true, amount: true },
    _count: true,
    orderBy: { _sum: { sellerEarning: "desc" } },
    take: 5,
  });
  const sellers = await prisma.user.findMany({
    where: { id: { in: sellerGroups.map((g) => g.sellerId) } },
    select: { id: true, name: true, email: true },
  });
  const topSellers = sellerGroups.map((g) => ({
    seller: sellers.find((s) => s.id === g.sellerId) ?? null,
    totalEarnings: g._sum.sellerEarning ?? 0,
    totalCommission: g._sum.commissionAmount ?? 0,
    totalSales: g._sum.amount ?? 0,
    salesCount: g._count,
  }));

  // Most recent commission-generating purchases
  const recentPurchases = await prisma.purchase.findMany({
    where: { commissionAmount: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      product: { select: { title: true } },
      channel: { select: { name: true } },
      buyer: { select: { name: true, email: true } },
      seller: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({
    balance: platformWallet.balance,
    totalCommissionFromPurchases: totals._sum.commissionAmount ?? 0,
    totalGMV: totals._sum.amount ?? 0,
    totalSellerPayouts: totals._sum.sellerEarning ?? 0,
    purchasesCount: totals._count,
    topSellers,
    recentPurchases,
  });
}
