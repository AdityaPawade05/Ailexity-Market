import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: real aggregated marketing performance for the caller — revenue
// attributed to discount codes / affiliate links, plus totals across the
// marketing tools they've actually used.
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellerId = session.userId;

  const [attributedRevenue, affiliateTotals, discountCodeTotals, campaignTotals] = await Promise.all([
    prisma.purchase.aggregate({
      where: {
        sellerId,
        OR: [{ affiliateLinkId: { not: null } }, { discountCodeId: { not: null } }],
      },
      _sum: { amount: true },
    }),
    prisma.affiliateLink.aggregate({
      where: { sellerId },
      _sum: { clicks: true, conversions: true, totalEarned: true },
      _count: { _all: true },
    }),
    prisma.discountCode.aggregate({
      where: { sellerId },
      _sum: { timesRedeemed: true },
      _count: { _all: true },
    }),
    prisma.marketingEmailCampaign.aggregate({
      where: { sellerId },
      _sum: { recipientCount: true },
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    grossRevenue: attributedRevenue._sum.amount ?? 0,
    clicks: affiliateTotals._sum.clicks ?? 0,
    conversions: affiliateTotals._sum.conversions ?? 0,
    affiliateLinksCount: affiliateTotals._count._all,
    affiliateEarned: affiliateTotals._sum.totalEarned ?? 0,
    discountCodesCount: discountCodeTotals._count._all,
    discountRedemptions: discountCodeTotals._sum.timesRedeemed ?? 0,
    campaignsSent: campaignTotals._count._all,
    campaignRecipients: campaignTotals._sum.recipientCount ?? 0,
  });
}
