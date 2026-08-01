import { describe, it, expect } from "vitest";
import { computeDiscountedPrice } from "@/lib/discount-codes";
import type { DiscountCode } from "@prisma/client";

function makeCode(overrides: Partial<DiscountCode>): DiscountCode {
  return {
    id: "test",
    code: "TEST",
    sellerId: "seller",
    productId: null,
    type: "PERCENT",
    value: 10,
    maxRedemptions: null,
    timesRedeemed: 0,
    active: true,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("computeDiscountedPrice", () => {
  it("applies a percentage discount", () => {
    expect(computeDiscountedPrice(100, makeCode({ type: "PERCENT", value: 25 }))).toBe(75);
    expect(computeDiscountedPrice(29.99, makeCode({ type: "PERCENT", value: 10 }))).toBe(26.99);
  });

  it("applies a fixed discount", () => {
    expect(computeDiscountedPrice(100, makeCode({ type: "FIXED", value: 30 }))).toBe(70);
    expect(computeDiscountedPrice(24.99, makeCode({ type: "FIXED", value: 5 }))).toBe(19.99);
  });

  it("never goes below zero — an oversized fixed discount clamps to free", () => {
    expect(computeDiscountedPrice(10, makeCode({ type: "FIXED", value: 50 }))).toBe(0);
    expect(computeDiscountedPrice(5, makeCode({ type: "PERCENT", value: 100 }))).toBe(0);
  });

  it("rounds to cents", () => {
    // 33% off 9.99 = 6.6933 → 6.69
    expect(computeDiscountedPrice(9.99, makeCode({ type: "PERCENT", value: 33 }))).toBe(6.69);
  });

  it("a 0-value discount changes nothing", () => {
    expect(computeDiscountedPrice(19.99, makeCode({ type: "PERCENT", value: 0 }))).toBe(19.99);
    expect(computeDiscountedPrice(19.99, makeCode({ type: "FIXED", value: 0 }))).toBe(19.99);
  });
});
