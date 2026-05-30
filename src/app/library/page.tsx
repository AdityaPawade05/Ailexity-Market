"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

type Purchase = {
  id: string;
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

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

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
          {purchases.map((p) => (
            <Link
              key={p.id}
              href={`/library/${p.id}`}
              className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-amber-200 hover:shadow-md"
            >
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                {p.product.imageUrl ? (
                  <img
                    src={p.product.imageUrl}
                    alt={p.product.title}
                    className="h-full w-full object-cover"
                  />
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
          ))}
        </div>
      )}
    </div>
  );
}
