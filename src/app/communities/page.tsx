"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface Tier {
  id: string;
  name: string;
  price: number;
  interval: string;
}

interface RawChannel {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  category: string | null;
  price: number;
  _count: { channelFollows: number };
  owner: { id: string; name: string };
}

interface RawCommunity {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  category: string | null;
  creator: { id: string; name: string };
  tiers: Tier[];
  _count: { members: number };
}

// Unified card shape so channels and communities render side by side.
interface Item {
  id: string;
  type: "channel" | "community";
  name: string;
  description: string | null;
  avatarUrl: string | null;
  category: string;
  creatorId: string;
  creatorName: string;
  memberCount: number;
  priceLabel: string;
  href: string;
}

interface CategoryGroup {
  category: string;
  items: Item[];
}

type TypeFilter = "All" | "Channels" | "Communities";

function communityPriceLabel(tiers: Tier[]): string {
  if (!tiers || tiers.length === 0) return "Free";
  const min = Math.min(...tiers.map((t) => t.price));
  if (min <= 0) return "Free";
  return `from $${(min / 100).toFixed(2)}`;
}

export default function CommunitiesPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce: only re-query the server 300ms after typing stops.
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const qs = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : "";
    Promise.all([
      fetch(`/api/channels${qs}`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      fetch(`/api/communities${qs}`)
        .then((res) => (res.ok ? res.json() : { communities: [] }))
        .catch(() => ({ communities: [] })),
    ])
      .then(([channelsData, communitiesData]) => {
        const channels: RawChannel[] = Array.isArray(channelsData)
          ? channelsData
          : channelsData.channels || [];
        const communities: RawCommunity[] = communitiesData.communities || [];

        const channelItems: Item[] = channels.map((c) => ({
          id: c.id,
          type: "channel",
          name: c.name,
          description: c.description,
          avatarUrl: c.avatarUrl,
          category: c.category || "General",
          creatorId: c.owner?.id ?? "",
          creatorName: c.owner?.name ?? "Unknown",
          memberCount: c._count?.channelFollows ?? 0,
          priceLabel: c.price && c.price > 0 ? `$${c.price}` : "Free",
          href: `/channel/${c.id}`,
        }));

        const communityItems: Item[] = communities.map((c) => ({
          id: c.id,
          type: "community",
          name: c.name,
          description: c.description,
          avatarUrl: c.avatarUrl,
          category: c.category || "General",
          creatorId: c.creator?.id ?? "",
          creatorName: c.creator?.name ?? "Unknown",
          memberCount: c._count?.members ?? 0,
          priceLabel: communityPriceLabel(c.tiers),
          href: `/communities/${c.id}`,
        }));

        const all = [...communityItems, ...channelItems];
        setItems(all);
        setAvailableCategories([
          "All",
          ...Array.from(new Set(all.map((i) => i.category))).sort((a, b) =>
            a.localeCompare(b)
          ),
        ]);
        setLoadingItems(false);
      })
      .catch((err) => {
        console.error("Failed to fetch listings:", err);
        setLoadingItems(false);
      });
  }, [loading, user, searchQuery]);

  async function handleDelete(item: Item) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(
        item.type === "community" ? `/api/communities/${item.id}` : `/api/channels/${item.id}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete");
      }
      setItems((prev) => prev.filter((i) => !(i.id === item.id && i.type === item.type)));
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Failed to delete"}`);
    }
  }

  if (loading || loadingItems) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">Communities</h1>
          <p className="mt-2 text-zinc-600">Discover and join communities</p>
        </div>
        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              <div className="h-6 w-32 animate-pulse rounded bg-zinc-200" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-32 animate-pulse rounded-lg bg-zinc-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Apply type filter, then group by category.
  const filteredByType = items.filter((i) =>
    typeFilter === "All"
      ? true
      : typeFilter === "Channels"
      ? i.type === "channel"
      : i.type === "community"
  );

  const groups: { [key: string]: Item[] } = {};
  filteredByType.forEach((i) => {
    if (!groups[i.category]) groups[i.category] = [];
    groups[i.category].push(i);
  });
  const categoryGroups: CategoryGroup[] = Object.entries(groups)
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => a.category.localeCompare(b.category));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Communities</h1>
            <p className="mt-2 text-zinc-600">Discover channels and communities by category</p>
          </div>
          {user && (
            <Link
              href="/channel/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-lg"
            >
              ✨ Create New
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search communities and channels..."
          className="w-full max-w-md rounded-lg border border-zinc-300 px-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Type filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["All", "Channels", "Communities"] as TypeFilter[]).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              t === typeFilter
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {availableCategories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              category === selectedCategory
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {categoryGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-zinc-500">Nothing here yet. Be the first to create one!</p>
        </div>
      ) : (
        <div className="space-y-12">
          {categoryGroups
            .filter((group) => selectedCategory === "All" || group.category === selectedCategory)
            .map((group) => (
              <div key={group.category}>
                <h2 className="mb-4 text-xl font-bold text-zinc-900">{group.category}</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => {
                    const isCommunity = item.type === "community";
                    const isOwner = !!user && item.creatorId === user.id;
                    return (
                      <div key={`${item.type}-${item.id}`} className="group relative">
                        {isOwner && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(item);
                            }}
                            title="Delete"
                            aria-label={`Delete ${item.name}`}
                            className="absolute right-3 top-3 z-10 rounded-full border border-zinc-200 bg-white/90 p-1.5 text-zinc-400 opacity-0 shadow-sm transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        <Link
                          href={item.href}
                          className="block overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                        >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {item.avatarUrl ? (
                              <img
                                src={item.avatarUrl}
                                alt={item.name}
                                className="h-12 w-12 rounded-full object-cover"
                              />
                            ) : (
                              <div
                                className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
                                  isCommunity
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {item.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className={`text-lg font-semibold text-zinc-900 ${
                                  isCommunity
                                    ? "group-hover:text-blue-600"
                                    : "group-hover:text-amber-600"
                                }`}
                              >
                                {item.name}
                              </h3>
                              {/* Type badge */}
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                  isCommunity
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {isCommunity ? "✨ Community" : "💬 Channel"}
                              </span>
                              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                                {item.category}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-zinc-500">by {item.creatorName}</p>
                            <p className="mt-2 text-sm text-zinc-600 line-clamp-2">
                              {item.description || "No description"}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                              <span className="rounded-full bg-zinc-100 px-2 py-1">
                                {item.memberCount} members
                              </span>
                              <span
                                className={`font-medium ${
                                  isCommunity ? "text-blue-600" : "text-amber-600"
                                }`}
                              >
                                {item.priceLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
