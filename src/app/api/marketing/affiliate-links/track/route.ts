import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST /api/marketing/affiliate-links/track — anonymous click beacon fired by
// the product page when it loads with ?aff=<code>. No auth: visitors clicking
// a shared affiliate link aren't necessarily signed in.
export async function POST(request: NextRequest) {
  const { code } = await request.json();
  if (typeof code !== "string" || !code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  // Best-effort — a bad/expired code shouldn't error out the page for a visitor.
  await prisma.affiliateLink
    .updateMany({ where: { code, active: true }, data: { clicks: { increment: 1 } } })
    .catch((err) => console.error("[AffiliateLink track]", err));

  return NextResponse.json({ ok: true }, { status: 200 });
}
