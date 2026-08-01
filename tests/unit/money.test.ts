import { describe, it, expect } from "vitest";
import { parseAmount, parsePrice, MAX_AMOUNT } from "@/lib/money";

describe("parseAmount (wallet deposits/withdrawals/transfers)", () => {
  it("accepts a plain positive number", () => {
    expect(parseAmount(50)).toBe(50);
  });

  it("accepts a numeric string", () => {
    expect(parseAmount("25.50")).toBe(25.5);
  });

  it("rounds to cents", () => {
    expect(parseAmount(10.999)).toBe(11);
    expect(parseAmount(10.004)).toBe(10);
    expect(parseAmount(0.005)).toBe(0.01);
  });

  it("rejects zero — a zero-value wallet movement is meaningless", () => {
    expect(parseAmount(0)).toBeNull();
    expect(parseAmount("0")).toBeNull();
  });

  it("rejects negative amounts — the classic negative-deposit exploit", () => {
    expect(parseAmount(-1)).toBeNull();
    expect(parseAmount("-100")).toBeNull();
    expect(parseAmount(-0.01)).toBeNull();
  });

  it("rejects Infinity and NaN", () => {
    expect(parseAmount(Infinity)).toBeNull();
    expect(parseAmount(-Infinity)).toBeNull();
    expect(parseAmount(NaN)).toBeNull();
    expect(parseAmount("Infinity")).toBeNull();
    expect(parseAmount("not a number")).toBeNull();
  });

  it("rejects amounts above MAX_AMOUNT", () => {
    expect(parseAmount(MAX_AMOUNT + 1)).toBeNull();
    expect(parseAmount(1e308)).toBeNull();
  });

  it("accepts exactly MAX_AMOUNT", () => {
    expect(parseAmount(MAX_AMOUNT)).toBe(MAX_AMOUNT);
  });

  it("rejects non-numeric types", () => {
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
    expect(parseAmount({})).toBeNull();
    expect(parseAmount([])).toBeNull();
    expect(parseAmount(true)).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("   ")).toBeNull();
  });
});

describe("parsePrice (product/channel prices)", () => {
  it("accepts zero — free products are allowed", () => {
    expect(parsePrice(0)).toBe(0);
    expect(parsePrice("0")).toBe(0);
  });

  it("accepts positive prices and rounds to cents", () => {
    expect(parsePrice(19.999)).toBe(20);
    expect(parsePrice("29.99")).toBe(29.99);
  });

  it("rejects negative prices", () => {
    expect(parsePrice(-0.01)).toBeNull();
    expect(parsePrice("-5")).toBeNull();
  });

  it("rejects Infinity, NaN, and oversized values", () => {
    expect(parsePrice(Infinity)).toBeNull();
    expect(parsePrice(NaN)).toBeNull();
    expect(parsePrice(MAX_AMOUNT + 0.01)).toBeNull();
  });
});
