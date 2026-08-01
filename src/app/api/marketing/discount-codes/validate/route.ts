import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveDiscountCode, computeDiscountedPrice } from "@/lib/discount-codes";
import { NextRequest, NextResponse } from "next/server";

// POST /api/marketing/discount-codes/validate — buyer-facing preview. Looks up
// and validates a code for a specific product and returns the discounted price.
// Does NOT redeem/increment anything — actual redemption happens atomically
// inside /api/purchases at purchase time.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId, code } = await request.json();
  if (!productId || typeof code !== "string") {
    return NextResponse.json({ error: "productId and code are required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const result = await resolveDiscountCode(code, product.sellerId, product.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const discountedPrice = computeDiscountedPrice(product.price, result.discountCode);

  return NextResponse.json(
    {
      valid: true,
      originalPrice: product.price,
      discountedPrice,
      discountAmount: Math.round((product.price - discountedPrice) * 100) / 100,
    },
    { status: 200 }
  );
}
