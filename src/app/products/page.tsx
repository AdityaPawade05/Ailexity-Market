"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  imageUrl: string | null;
  duration?: string | null;
  pages?: number | null;
  seller?: { name: string } | null;
  _count?: { purchases: number };
};

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get("type") || "";
  const search = searchParams.get("search") || "";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (search) params.set("search", search);
    fetch(`/api/products?${params}`)
      .then((res) => res.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [type, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (searchInput.trim()) params.set("search", searchInput.trim());
    router.push(`/products?${params}`);
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">
          {type === "ebook" ? "Ebooks" : type === "course" ? "Courses" : "Discover"}
        </h1>
        <p className="mt-2 text-zinc-600">
          {type
            ? `Browse our ${type}s from expert creators`
            : "Explore ebooks and courses to grow your skills"}
        </p>
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products..."
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600"
          >
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl bg-zinc-200" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 py-16 text-center">
          <p className="text-zinc-600">No products found yet.</p>
          <p className="mt-2 text-sm text-zinc-500">Check back soon or try a different search.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Suspense
        fallback={
          <>
            <div className="mb-8">
              <div className="h-9 w-48 animate-pulse rounded bg-zinc-200" />
              <div className="mt-2 h-5 w-96 animate-pulse rounded bg-zinc-200" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 animate-pulse rounded-xl bg-zinc-200" />
              ))}
            </div>
          </>
        }
      >
        <ProductsContent />
      </Suspense>
    </div>
  );
}
