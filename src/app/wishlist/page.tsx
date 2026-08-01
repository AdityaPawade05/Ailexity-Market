"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type WishlistItem = {
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

export default function WishlistPage() {
  const { user, loading: authLoading, refreshCart, refreshWishlist } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadWishlist = useCallback(async () => {
    const res = await fetch("/api/wishlist");
    const data = await res.json();
    if (res.ok) setItems(data.items || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) loadWishlist();
  }, [user, authLoading, router, loadWishlist]);

  async function removeItem(productId: string) {
    setRemovingId(productId);
    try {
      await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      await refreshWishlist();
    } finally {
      setRemovingId(null);
    }
  }

  async function moveToCart(item: WishlistItem) {
    setMovingId(item.productId);
    setMessage("");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.productId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to add to cart");
        return;
      }
      await fetch(`/api/wishlist/${item.productId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.productId !== item.productId));
      await Promise.all([refreshCart(), refreshWishlist()]);
    } finally {
      setMovingId(null);
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-zinc-900">Saved for Later</h1>

      {message && (
        <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{message}</div>
      )}

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <p className="text-zinc-600">Nothing saved yet.</p>
          <Link href="/products" className="mt-4 inline-block text-amber-600 hover:text-amber-700 font-medium">
            Browse the marketplace
          </Link>
        </div>
      ) : (
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
                  <p className="text-xs text-rose-600 mt-0.5">No longer available</p>
                )}
              </div>
              <span className="text-lg font-bold text-amber-600 shrink-0">${item.product.price.toFixed(2)}</span>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  onClick={() => moveToCart(item)}
                  disabled={movingId === item.productId || !item.product.published}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {movingId === item.productId ? "Adding..." : "Add to Cart"}
                </button>
                <button
                  onClick={() => removeItem(item.productId)}
                  disabled={removingId === item.productId}
                  className="text-xs font-medium text-zinc-400 hover:text-rose-600 disabled:opacity-50"
                >
                  {removingId === item.productId ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
