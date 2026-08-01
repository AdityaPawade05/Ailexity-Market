import { prisma } from "@/lib/prisma";
import type { DiscountCode } from "@prisma/client";

export type ResolveDiscountResult =
  | { ok: true; discountCode: DiscountCode }
  | { ok: false; error: string };

// Shared lookup/validity rules for a buyer-supplied discount code, used both by
// the buyer-facing preview (validate/route.ts) and the real redemption inside
// /api/purchases so the two can never diverge on what counts as "valid".
export async function resolveDiscountCode(
  rawCode: string,
  sellerId: string,
  productId: string
): Promise<ResolveDiscountResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "No code provided" };

  const discountCode = await prisma.discountCode.findUnique({
    where: { sellerId_code: { sellerId, code } },
  });

  if (!discountCode || !discountCode.active) {
    return { ok: false, error: "Invalid discount code" };
  }
  if (discountCode.productId && discountCode.productId !== productId) {
    return { ok: false, error: "This code doesn't apply to this product" };
  }
  if (discountCode.expiresAt && discountCode.expiresAt < new Date()) {
    return { ok: false, error: "This code has expired" };
  }
  if (
    discountCode.maxRedemptions !== null &&
    discountCode.timesRedeemed >= discountCode.maxRedemptions
  ) {
    return { ok: false, error: "This code has reached its redemption limit" };
  }

  return { ok: true, discountCode };
}

export function computeDiscountedPrice(basePrice: number, discountCode: DiscountCode): number {
  const raw =
    discountCode.type === "PERCENT"
      ? basePrice * (1 - discountCode.value / 100)
      : basePrice - discountCode.value;
  return Math.max(0, Math.round(raw * 100) / 100);
}
