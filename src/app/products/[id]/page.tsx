"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  imageUrl: string | null;
  fileUrl: string | null;
  duration?: string | null;
  pages?: number | null;
  published: boolean;
  seller?: { id: string; name: string } | null;
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const refId = searchParams.get("ref");
  const [origin, setOrigin] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch(`/api/products/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handlePurchaseClick() {
    if (!user) {
      router.push("/login");
      return;
    }
    setError("");
    setPurchasing(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product?.id, paymentMethod: "free", referredBy: refId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Purchase failed");
        setPurchasing(false);
        return;
      }
      router.push("/library");
    } catch {
      setError("Something went wrong");
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="h-96 animate-pulse rounded-2xl bg-zinc-200" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-zinc-900">Product not found</h2>
        <Link href="/products" className="mt-4 inline-block text-amber-600 hover:text-amber-700">
          Back to marketplace
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === product.seller?.id;
  const isAdmin = user?.role === "admin";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="lg:w-1/2">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-zinc-100">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-6xl">
                {product.type === "ebook" ? "📚" : "🎓"}
              </div>
            )}
          </div>
        </div>
        <div className="lg:w-1/2">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
            {product.type}
          </span>
          <h1 className="mt-4 text-3xl font-bold text-zinc-900">{product.title}</h1>
          {product.seller && (
            <p className="mt-2 text-zinc-600">by {product.seller.name}</p>
          )}
          <div className="mt-4 flex gap-4 text-sm text-zinc-500">
            {product.duration && <span>⏱ {product.duration}</span>}
            {product.pages && <span>📄 {product.pages} pages</span>}
          </div>
          <p className="mt-6 text-zinc-600">{product.description}</p>
          <div className="mt-8 flex items-center gap-4">
            <span className="text-3xl font-bold text-amber-600">
              ${product.price.toFixed(2)}
            </span>
            {!product.published && (
              <span className="rounded bg-zinc-200 px-2 py-1 text-xs text-zinc-600">
                Draft
              </span>
            )}
          </div>

          {user && product.published && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">🎁 Share & Earn!</p>
              <p className="mt-1 text-xs text-amber-700">Recommend this {product.type} to others using your unique link below. For every 10 people who purchase from your link, you earn a free book!</p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${origin}/products/${product.id}?ref=${user.id}`}
                  className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-zinc-600 outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${origin}/products/${product.id}?ref=${user.id}`);
                    alert("Link copied!");
                  }}
                  className="rounded-lg bg-amber-200 px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-300 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          )}

          {(isOwner || isAdmin) ? (
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-lg bg-zinc-200 px-6 py-3 font-medium text-zinc-700 hover:bg-zinc-300"
            >
              Manage in Dashboard
            </Link>
          ) : product.published ? (
            <button
              onClick={handlePurchaseClick}
              disabled={purchasing}
              className="mt-6 w-full rounded-lg bg-amber-500 py-4 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 sm:w-auto sm:px-12"
            >
              {purchasing ? "Processing..." : "Purchase"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
