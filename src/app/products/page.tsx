"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";

type Filters = { search: string; minPrice: string; maxPrice: string };

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

const SORT_OPTIONS = [
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

// Local input state initialized once from `initial` — keying this component
// by the URL values (see usage below) resets it on navigation instead of
// syncing via an effect.
function FilterForm({
  initial,
  sort,
  onSortChange,
  onSubmit,
}: {
  initial: Filters;
  sort: string;
  onSortChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSubmit: (filters: Filters) => void;
}) {
  const [filters, setFilters] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(filters);
      }}
      className="mt-4 flex flex-wrap gap-2"
    >
      <input
        type="search"
        value={filters.search}
        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        placeholder="Search products..."
        className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 px-4 py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
      />
      <input
        type="number"
        min="0"
        step="0.01"
        value={filters.minPrice}
        onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))}
        placeholder="Min $"
        className="w-24 rounded-lg border border-zinc-300 px-3 py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
      />
      <input
        type="number"
        min="0"
        step="0.01"
        value={filters.maxPrice}
        onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
        placeholder="Max $"
        className="w-24 rounded-lg border border-zinc-300 px-3 py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
      />
      <select
        value={sort}
        onChange={onSortChange}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600"
      >
        Search
      </button>
    </form>
  );
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get("type") || "";
  const search = searchParams.get("search") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const sort = searchParams.get("sort") || "popular";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (search) params.set("search", search);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (sort && sort !== "popular") params.set("sort", sort);
    fetch(`/api/products?${params}`)
      .then((res) => res.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [type, search, minPrice, maxPrice, sort]);

  function buildParams(overrides: Partial<Filters & { sort: string }>) {
    const params = new URLSearchParams();
    const values = { type, search, minPrice, maxPrice, sort, ...overrides };
    if (values.type) params.set("type", values.type);
    if (values.search) params.set("search", values.search);
    if (values.minPrice) params.set("minPrice", values.minPrice);
    if (values.maxPrice) params.set("maxPrice", values.maxPrice);
    if (values.sort && values.sort !== "popular") params.set("sort", values.sort);
    return params;
  }

  function handleFilterSubmit(filters: Filters) {
    router.push(`/products?${buildParams({ search: filters.search.trim(), minPrice: filters.minPrice.trim(), maxPrice: filters.maxPrice.trim() })}`);
  }

  function handleSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/products?${buildParams({ sort: e.target.value })}`);
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
        <FilterForm
          key={`${search}|${minPrice}|${maxPrice}`}
          initial={{ search, minPrice, maxPrice }}
          sort={sort}
          onSortChange={handleSortChange}
          onSubmit={handleFilterSubmit}
        />
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
