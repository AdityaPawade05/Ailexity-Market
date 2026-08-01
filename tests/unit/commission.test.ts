import { describe, it, expect } from "vitest";
import { splitPayment, COMMISSION_RATE } from "@/lib/commission";

describe("splitPayment (platform commission math)", () => {
  it("splits a round amount 10/90 by default", () => {
    const { commission, sellerEarning } = splitPayment(100);
    expect(commission).toBeCloseTo(100 * COMMISSION_RATE, 2);
    expect(sellerEarning).toBeCloseTo(100 - 100 * COMMISSION_RATE, 2);
  });

  it("commission + sellerEarning always equals the full amount (no money created or destroyed)", () => {
    for (const amount of [0.01, 0.99, 1, 9.99, 24.99, 29.99, 79.99, 100, 999.99, 1000000]) {
      const { commission, sellerEarning } = splitPayment(amount);
      expect(commission + sellerEarning).toBeCloseTo(amount, 2);
    }
  });

  it("both halves are rounded to cents", () => {
    const { commission, sellerEarning } = splitPayment(9.99);
    expect(commission).toBe(Math.round(commission * 100) / 100);
    expect(sellerEarning).toBe(Math.round(sellerEarning * 100) / 100);
  });

  it("handles a zero amount (free purchase)", () => {
    const { commission, sellerEarning } = splitPayment(0);
    expect(commission).toBe(0);
    expect(sellerEarning).toBe(0);
  });

  it("never gives the seller more than the sale amount", () => {
    for (const amount of [0.01, 1, 50, 12345.67]) {
      const { sellerEarning } = splitPayment(amount);
      expect(sellerEarning).toBeLessThanOrEqual(amount);
      expect(sellerEarning).toBeGreaterThanOrEqual(0);
    }
  });
});
