"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ProductCard } from "@/components/ProductCard";
import { StarRating } from "@/components/StarRating";

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  imageUrl: string | null;
  seller?: { name: string } | null;
  _count?: { purchases: number };
  avgRating?: number | null;
  reviewCount?: number;
};

type ListingItem = {
  id: string;
  type: "channel" | "community";
  name: string;
  description: string | null;
  avatarUrl: string | null;
  category: string;
  memberCount: number;
  href: string;
};

type SearchUser = {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  bio: string | null;
  following: boolean;
  followersCount: number;
  productsCount: number;
};

type Tab = "products" | "communities" | "users";

function ListingCard({ item }: { item: ListingItem }) {
  const isCommunity = item.type === "community";
  return (
    <Link
      href={item.href}
      className="flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex-shrink-0">
        {item.avatarUrl ? (
          <img src={item.avatarUrl} alt={item.name} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${isCommunity ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
            {item.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-zinc-900">{item.name}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isCommunity ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
            {isCommunity ? "Community" : "Channel"}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{item.description || "No description"}</p>
        <p className="mt-2 text-xs text-zinc-500">{item.memberCount} members · {item.category}</p>
      </div>
    </Link>
  );
}

function UserResultCard({ result }: { result: SearchUser }) {
  const [following, setFollowing] = useState(result.following);
  const [loading, setLoading] = useState(false);

  async function handleFollow(e: React.MouseEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: result.id }),
      });
      const data = await res.json();
      if (res.ok) setFollowing(data.following);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Link
      href={`/profile/${result.id}`}
      className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 to-orange-500 font-bold text-white">
        {result.avatar ? <img src={result.avatar} alt="" className="h-full w-full object-cover" /> : result.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-zinc-900">{result.name}</p>
        <p className="truncate text-sm text-zinc-500">
          {result.bio || `${result.productsCount} products · ${result.followersCount} followers`}
        </p>
      </div>
      <button
        onClick={handleFollow}
        disabled={loading}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
          following ? "bg-zinc-100 text-zinc-600" : "bg-amber-500 text-white hover:bg-amber-600"
        }`}
      >
        {following ? "Following" : "Follow"}
      </button>
    </Link>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const q = searchParams.get("q") || "";
  const initialTab = (searchParams.get("tab") as Tab) || "products";

  const [input, setInput] = useState(q);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [users, setUsers] = useState<SearchUser[]>([]);

  useEffect(() => {
    setInput(q);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    const tasks: Promise<void>[] = [];

    if (q) {
      tasks.push(
        fetch(`/api/products?search=${encodeURIComponent(q)}`)
          .then((r) => r.json())
          .then((data) => setProducts(Array.isArray(data) ? data : []))
          .catch(() => setProducts([]))
      );

      tasks.push(
        Promise.all([
          fetch(`/api/channels?search=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch(`/api/communities?search=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : { communities: [] })).catch(() => ({ communities: [] })),
        ]).then(([channelsData, communitiesData]) => {
          const channels = Array.isArray(channelsData) ? channelsData : channelsData.channels || [];
          const communities = communitiesData.communities || [];
          const merged: ListingItem[] = [
            ...communities.map((c: { id: string; name: string; description: string | null; avatarUrl: string | null; category: string | null; _count?: { members: number } }) => ({
              id: c.id,
              type: "community" as const,
              name: c.name,
              description: c.description,
              avatarUrl: c.avatarUrl,
              category: c.category || "General",
              memberCount: c._count?.members ?? 0,
              href: `/communities/${c.id}`,
            })),
            ...channels.map((c: { id: string; name: string; description: string | null; avatarUrl: string | null; category: string | null; followersCount?: number }) => ({
              id: c.id,
              type: "channel" as const,
              name: c.name,
              description: c.description,
              avatarUrl: c.avatarUrl,
              category: c.category || "General",
              memberCount: c.followersCount ?? 0,
              href: `/channel/${c.id}`,
            })),
          ];
          setListings(merged);
        })
      );

      tasks.push(
        fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
          .then((r) => r.json())
          .then((data) => setUsers(Array.isArray(data) ? data : []))
          .catch(() => setUsers([]))
      );
    } else {
      setProducts([]);
      setListings([]);
      if (user) {
        tasks.push(
          fetch("/api/users/popular")
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setUsers(Array.isArray(data) ? data : []))
            .catch(() => setUsers([]))
        );
      } else {
        setUsers([]);
      }
    }

    Promise.all(tasks).finally(() => setLoading(false));
  }, [q, user]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (input.trim()) params.set("q", input.trim());
    if (tab !== "products") params.set("tab", tab);
    router.push(`/search?${params}`);
  }

  function switchTab(next: Tab) {
    setTab(next);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (next !== "products") params.set("tab", next);
    router.replace(`/search?${params}`);
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "products", label: "Products", count: products.length },
    { key: "communities", label: "Communities & Channels", count: listings.length },
    { key: "users", label: "People", count: users.length },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-zinc-900">Search</h1>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search products, communities, or people..."
          autoFocus
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
        />
        <button type="submit" className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600">
          Search
        </button>
      </form>

      <div className="mt-6 flex gap-6 border-b border-zinc-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`pb-3 text-sm font-medium transition border-b-2 ${
              tab === t.key ? "border-amber-500 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t.label}
            {q && <span className="ml-1.5 text-xs text-zinc-400">({t.count})</span>}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-200" />
            ))}
          </div>
        ) : (
          <>
            {tab === "products" && (
              !q ? (
                <p className="py-12 text-center text-zinc-500">Type something above to search products.</p>
              ) : products.length === 0 ? (
                <p className="py-12 text-center text-zinc-500">No products match &ldquo;{q}&rdquo;.</p>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((p) => (
                    <div key={p.id}>
                      <ProductCard product={p} />
                      {!!p.reviewCount && p.avgRating != null && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <StarRating value={p.avgRating} size={12} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === "communities" && (
              !q ? (
                <p className="py-12 text-center text-zinc-500">Type something above to search communities and channels.</p>
              ) : listings.length === 0 ? (
                <p className="py-12 text-center text-zinc-500">No communities or channels match &ldquo;{q}&rdquo;.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {listings.map((item) => (
                    <ListingCard key={`${item.type}-${item.id}`} item={item} />
                  ))}
                </div>
              )
            )}

            {tab === "users" && (
              users.length === 0 ? (
                <p className="py-12 text-center text-zinc-500">
                  {q ? `No people match "${q}".` : user ? "No popular users to show yet." : "Log in to see popular users, or search for someone above."}
                </p>
              ) : (
                <div className="space-y-3">
                  {!q && <p className="text-xs uppercase tracking-wide text-zinc-400 font-semibold">Popular users</p>}
                  {users.map((u) => (
                    <UserResultCard key={u.id} result={u} />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}
