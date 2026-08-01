import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const NEW_VISITOR_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// GET: real buyer counts for each audience preset, computed from the
// caller's actual purchase history.
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const purchases = await prisma.purchase.findMany({
    where: { sellerId: session.userId },
    select: { buyerId: true, createdAt: true, discountCodeId: true, affiliateLinkId: true },
  });

  const byBuyer = new Map<string, { count: number; firstPurchase: Date; usedMarketing: boolean }>();
  for (const p of purchases) {
    const entry = byBuyer.get(p.buyerId);
    const usedMarketing = Boolean(p.discountCodeId || p.affiliateLinkId);
    if (!entry) {
      byBuyer.set(p.buyerId, { count: 1, firstPurchase: p.createdAt, usedMarketing });
    } else {
      entry.count += 1;
      if (p.createdAt < entry.firstPurchase) entry.firstPurchase = p.createdAt;
      entry.usedMarketing = entry.usedMarketing || usedMarketing;
    }
  }

  const now = Date.now();
  let repeatBuyers = 0;
  let newVisitors = 0;
  let highIntent = 0;
  for (const entry of byBuyer.values()) {
    if (entry.count > 1) repeatBuyers++;
    if (now - entry.firstPurchase.getTime() <= NEW_VISITOR_WINDOW_MS) newVisitors++;
    if (entry.usedMarketing) highIntent++;
  }

  return NextResponse.json({
    "All buyers": byBuyer.size,
    "Repeat buyers": repeatBuyers,
    "New visitors": newVisitors,
    "High intent": highIntent,
  });
}
