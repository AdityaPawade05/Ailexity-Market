"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type CartItem = {
  id: string;
  productId: string;
  product: {
    id: string;
    title: string;
    price: number;
    type: string;
    imageUrl: string | null;
    published: boolean;
    seller: { id: string; name: string } | null;
  };
};

export default function CartPage() {
  const { user, loading: authLoading, walletBalance, refreshWallet, refreshCart } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [skippedNote, setSkippedNote] = useState("");

  const loadCart = useCallback(async () => {
    const res = await fetch("/api/cart");
    const data = await res.json();
    if (res.ok) setItems(data.items || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) loadCart();
  }, [user, authLoading, router, loadCart]);

  async function removeItem(productId: string) {
    setRemovingId(productId);
    try {
      await fetch(`/api/cart/${productId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      await refreshCart();
    } finally {
      setRemovingId(null);
    }
  }

  async function checkout() {
    setError("");
    setSkippedNote("");
    setCheckingOut(true);
    try {
      const res = await fetch("/api/cart/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Checkout failed");
        if (Array.isArray(data.skipped) && data.skipped.length > 0) {
          await loadCart();
        }
        return;
      }
      await Promise.all([refreshWallet(), refreshCart()]);
      if (Array.isArray(data.skipped) && data.skipped.length > 0) {
        setSkippedNote(
          `Skipped ${data.skipped.length} item(s) that were no longer available: ${data.skipped.map((s: { title: string }) => s.title).join(", ")}.`
        );
      }
      router.push("/library");
    } catch {
      setError("Something went wrong");
    } finally {
      setCheckingOut(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-200" />
          ))}
        </div>
      </div>
    );
  }

  const total = items.reduce((sum, i) => sum + i.product.price, 0);
  const insufficientFunds = walletBalance !== null && walletBalance < total;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-zinc-900">Your Cart</h1>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <p className="text-zinc-600">Your cart is empty.</p>
          <Link href="/products" className="mt-4 inline-block text-amber-600 hover:text-amber-700 font-medium">
            Browse the marketplace
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-amber-100 flex items-center justify-center text-2xl">
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.title} className="h-full w-full object-cover" />
                  ) : (
                    <span>{item.product.type === "ebook" ? "📚" : "🎓"}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.product.id}`} className="font-semibold text-zinc-900 hover:text-amber-600 line-clamp-1">
                    {item.product.title}
                  </Link>
                  {item.product.seller && (
                    <p className="text-sm text-zinc-500">by {item.product.seller.name}</p>
                  )}
                  {!item.product.published && (
                    <p className="text-xs text-rose-600 mt-0.5">No longer available — will be removed at checkout</p>
                  )}
                </div>
                <span className="text-lg font-bold text-amber-600 shrink-0">${item.product.price.toFixed(2)}</span>
                <button
                  onClick={() => removeItem(item.productId)}
                  disabled={removingId === item.productId}
                  className="shrink-0 rounded-lg bg-rose-100 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-200 disabled:opacity-50"
                >
                  {removingId === item.productId ? "..." : "Remove"}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between text-lg">
              <span className="font-medium text-zinc-700">Total</span>
              <span className="font-bold text-zinc-900">${total.toFixed(2)}</span>
            </div>

            {walletBalance !== null && (
              <p className="mt-1 text-sm text-zinc-500">Wallet balance: ${walletBalance.toFixed(2)}</p>
            )}

            {insufficientFunds && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                ⚠️ Your wallet balance is below your cart total.{" "}
                <Link href="/business/balances" className="font-semibold underline hover:text-amber-900">
                  Top up your wallet
                </Link>{" "}
                to complete checkout.
              </div>
            )}

            {error && <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
            {skippedNote && <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">{skippedNote}</div>}

            <button
              onClick={checkout}
              disabled={checkingOut}
              className="mt-6 w-full rounded-lg bg-amber-500 py-4 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {checkingOut ? "Processing..." : `Checkout — $${total.toFixed(2)}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
