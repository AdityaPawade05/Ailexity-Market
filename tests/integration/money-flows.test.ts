import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Session, assertServerUp, round2 } from "./helpers";

// End-to-end money-flow tests against the running dev server + real Postgres,
// using the seeded demo accounts. All wallet assertions are DELTAS (before vs
// after), so pre-existing dev-database state doesn't matter. Every product and
// wallet movement created here is reversed or removed before the suite ends.
//
// Kept in ONE file on purpose: tests within a file run sequentially, which
// keeps concurrent tests from interfering with the same wallets, and the
// single login-per-account stays under /api/auth/login's rate limit.

const buyer = new Session();
const seller = new Session();

const DEPOSIT = 100;
const PRICE = 40;
const CART_PRICE_A = 10.5;
const CART_PRICE_B = 5.25;

const createdProductIds: string[] = [];
const purchaseIdsToRefund: string[] = [];

async function createProduct(price: number, title: string): Promise<string> {
  const { status, body } = await seller.post("/api/products", {
    title,
    description: "integration test product — safe to ignore",
    price,
    type: "ebook",
    published: true,
  });
  expect(status).toBe(200);
  const id = body.id as string;
  createdProductIds.push(id);
  return id;
}

beforeAll(async () => {
  await assertServerUp();
  await buyer.login("buyer@ailexity.com", "buyer123");
  await seller.login("seller@ailexity.com", "seller123");
  // Fund the buyer once for the whole suite; withdrawn again in afterAll.
  const { status } = await buyer.post("/api/wallet/deposit", { amount: DEPOSIT });
  expect(status).toBe(200);
});

afterAll(async () => {
  // Refund any purchase a failing test left un-refunded, then remove test
  // products and withdraw the suite's deposit so wallets end where they began.
  for (const id of purchaseIdsToRefund) {
    await seller.post(`/api/purchases/${id}/refund`, { reason: "test cleanup" });
  }
  for (const id of createdProductIds) {
    await seller.delete(`/api/products/${id}`);
  }
  await buyer.post("/api/wallet/withdraw", { amount: DEPOSIT });
});

describe("wallet input validation", () => {
  it("rejects a negative deposit (the free-money exploit)", async () => {
    const { status } = await buyer.post("/api/wallet/deposit", { amount: -50 });
    expect(status).toBe(400);
  });

  it("rejects a non-numeric deposit", async () => {
    const { status } = await buyer.post("/api/wallet/deposit", { amount: "Infinity" });
    expect(status).toBe(400);
  });

  it("rejects withdrawing more than the balance", async () => {
    const balance = await buyer.walletBalance();
    const { status } = await buyer.post("/api/wallet/withdraw", { amount: round2(balance + 1000) });
    expect(status).toBe(400);
  });
});

describe("single purchase money flow", () => {
  let productId: string;
  let purchaseId: string;

  it("seller lists a product", async () => {
    productId = await createProduct(PRICE, `IT single ${Date.now()}`);
  });

  it("purchase debits the buyer and credits the seller 90/10, atomically", async () => {
    const buyerBefore = await buyer.walletBalance();
    const sellerBefore = await seller.walletBalance();

    const { status, body } = await buyer.post("/api/purchases", { productId });
    expect(status).toBe(200);
    purchaseId = body.id as string;
    purchaseIdsToRefund.push(purchaseId);

    expect(body.amount).toBe(PRICE);
    expect(body.commissionAmount).toBeCloseTo(PRICE * 0.1, 2);
    expect(body.sellerEarning).toBeCloseTo(PRICE * 0.9, 2);

    expect(await buyer.walletBalance()).toBeCloseTo(buyerBefore - PRICE, 2);
    expect(await seller.walletBalance()).toBeCloseTo(sellerBefore + PRICE * 0.9, 2);
  });

  it("rejects buying the same product twice", async () => {
    const { status, body } = await buyer.post("/api/purchases", { productId });
    expect(status).toBe(400);
    expect(String(body.error)).toMatch(/already own/i);
  });

  it("rejects a seller buying their own product", async () => {
    const { status } = await seller.post("/api/purchases", { productId });
    expect(status).toBe(400);
  });

  it("rejects a purchase the buyer can't afford", async () => {
    const balance = await buyer.walletBalance();
    const expensiveId = await createProduct(round2(balance + 500), `IT expensive ${Date.now()}`);
    const { status } = await buyer.post("/api/purchases", { productId: expensiveId });
    expect(status).toBe(402);
    // Balance untouched by the failed attempt
    expect(await buyer.walletBalance()).toBeCloseTo(balance, 2);
  });

  describe("refund workflow", () => {
    it("a buyer cannot refund directly — only request", async () => {
      const { status } = await buyer.post(`/api/purchases/${purchaseId}/refund`);
      expect(status).toBe(403);
    });

    it("buyer submits a refund request", async () => {
      const { status } = await buyer.post(`/api/purchases/${purchaseId}/refund-request`, {
        reason: "integration test",
      });
      expect(status).toBe(200);
    });

    it("duplicate refund request is rejected", async () => {
      const { status } = await buyer.post(`/api/purchases/${purchaseId}/refund-request`);
      expect(status).toBe(400);
    });

    it("seller approves — money moves back exactly", async () => {
      const buyerBefore = await buyer.walletBalance();
      const sellerBefore = await seller.walletBalance();

      const { status } = await seller.post(`/api/purchases/${purchaseId}/refund`);
      expect(status).toBe(200);
      purchaseIdsToRefund.splice(purchaseIdsToRefund.indexOf(purchaseId), 1);

      expect(await buyer.walletBalance()).toBeCloseTo(buyerBefore + PRICE, 2);
      expect(await seller.walletBalance()).toBeCloseTo(sellerBefore - PRICE * 0.9, 2);
    });

    it("double refund is rejected", async () => {
      const { status } = await seller.post(`/api/purchases/${purchaseId}/refund`);
      expect(status).toBe(400);
    });

    it("refunded purchase no longer grants content access", async () => {
      const { status } = await buyer.get(`/api/owned/${purchaseId}`);
      expect(status).toBe(403);
    });

    it("buyer can re-purchase after the refund", async () => {
      const { status, body } = await buyer.post("/api/purchases", { productId });
      expect(status).toBe(200);
      purchaseIdsToRefund.push(body.id as string);
    });
  });
});

describe("cart checkout money flow", () => {
  let productA: string;
  let productB: string;

  it("buyer fills the cart", async () => {
    productA = await createProduct(CART_PRICE_A, `IT cart A ${Date.now()}`);
    productB = await createProduct(CART_PRICE_B, `IT cart B ${Date.now()}`);

    expect((await buyer.post("/api/cart", { productId: productA })).status).toBe(201);
    expect((await buyer.post("/api/cart", { productId: productB })).status).toBe(201);

    const { body } = await buyer.get("/api/cart");
    const ids = (body.items as { productId: string }[]).map((i) => i.productId);
    expect(ids).toContain(productA);
    expect(ids).toContain(productB);
  });

  it("a seller can't add their own product to their cart", async () => {
    const { status } = await seller.post("/api/cart", { productId: productA });
    expect(status).toBe(400);
  });

  it("checkout debits the exact total once and empties the cart", async () => {
    const total = round2(CART_PRICE_A + CART_PRICE_B);
    const buyerBefore = await buyer.walletBalance();
    const sellerBefore = await seller.walletBalance();

    const { status, body } = await buyer.post("/api/cart/checkout");
    expect(status).toBe(200);
    expect(body.total).toBeCloseTo(total, 2);

    const purchases = body.purchases as { id: string; amount: number; commissionAmount: number; sellerEarning: number }[];
    expect(purchases).toHaveLength(2);
    for (const p of purchases) {
      expect(p.commissionAmount + p.sellerEarning).toBeCloseTo(p.amount, 2);
      purchaseIdsToRefund.push(p.id);
    }

    expect(await buyer.walletBalance()).toBeCloseTo(buyerBefore - total, 2);
    const sellerEarned = purchases.reduce((s, p) => s + p.sellerEarning, 0);
    expect(await seller.walletBalance()).toBeCloseTo(sellerBefore + sellerEarned, 2);

    const { body: cartAfter } = await buyer.get("/api/cart");
    expect(cartAfter.items).toHaveLength(0);
  });

  it("checkout on an empty cart is rejected", async () => {
    const { status } = await buyer.post("/api/cart/checkout");
    expect(status).toBe(400);
  });
});
