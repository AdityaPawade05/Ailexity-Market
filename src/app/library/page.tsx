"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

type Purchase = {
  id: string;
  amount: number;
  refunded: boolean;
  refundRequestedAt: string | null;
  product: {
    id: string;
    title: string;
    type: string;
    imageUrl: string | null;
    fileUrl: string | null;
    seller: { name: string };
  };
  createdAt: string;
};

const REFUND_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      fetch("/api/owned")
        .then((res) => res.json())
        .then(setPurchases)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  async function requestRefund(purchase: Purchase) {
    if (!confirm(`Request a refund for "${purchase.product.title}"? This sends a request to the seller and Ailexity admins for review — you'll keep access until it's approved.`)) {
      return;
    }
    setRefundingId(purchase.id);
    try {
      const res = await fetch(`/api/purchases/${purchase.id}/refund-request`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to submit refund request");
        return;
      }
      setPurchases((prev) =>
        prev.map((p) => (p.id === purchase.id ? { ...p, refundRequestedAt: new Date().toISOString() } : p))
      );
    } finally {
      setRefundingId(null);
    }
  }

  if (authLoading || !user) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-zinc-900">My Library</h1>
      <p className="mt-2 text-zinc-600">Your purchased ebooks and courses</p>

      {loading ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-zinc-200" />
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <p className="text-zinc-600">You haven&apos;t purchased anything yet.</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-lg bg-amber-500 px-6 py-2 font-medium text-white hover:bg-amber-600"
          >
            Explore Marketplace
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {purchases.map((p) => {
            const refundEligible = !p.refunded && Date.now() - new Date(p.createdAt).getTime() <= REFUND_WINDOW_MS;
            return (
              <div
                key={p.id}
                className={`flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm transition ${
                  p.refunded ? "border-zinc-200 opacity-60" : "border-zinc-200 hover:border-amber-200 hover:shadow-md"
                }`}
              >
                {p.refunded ? (
                  <div className="flex gap-4">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                      {p.product.imageUrl ? (
                        <img src={p.product.imageUrl} alt={p.product.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl">
                          {p.product.type === "ebook" ? "📚" : "🎓"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-zinc-900 truncate">{p.product.title}</h3>
                      <p className="text-sm text-zinc-500">{p.product.seller.name}</p>
                      <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                        Refunded
                      </span>
                    </div>
                  </div>
                ) : (
                  <Link href={`/library/${p.id}`} className="flex gap-4">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                      {p.product.imageUrl ? (
                        <img src={p.product.imageUrl} alt={p.product.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl">
                          {p.product.type === "ebook" ? "📚" : "🎓"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-zinc-900 truncate">{p.product.title}</h3>
                      <p className="text-sm text-zinc-500">{p.product.seller.name}</p>
                      <p className="mt-2 text-xs text-zinc-400">
                        Purchased {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                      <span className="mt-2 inline-block text-sm font-medium text-amber-600 hover:text-amber-700">
                        Open Reader →
                      </span>
                    </div>
                  </Link>
                )}

                {!p.refunded && p.refundRequestedAt && (
                  <span className="self-start rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Refund requested — pending review
                  </span>
                )}

                {!p.refunded && !p.refundRequestedAt && (
                  <button
                    onClick={() => requestRefund(p)}
                    disabled={refundingId === p.id}
                    title={!refundEligible ? "Outside the 14-day self-service window — contact the seller" : undefined}
                    className="self-start text-xs font-medium text-zinc-400 hover:text-rose-600 disabled:opacity-50"
                  >
                    {refundingId === p.id ? "Submitting..." : "Request refund"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
