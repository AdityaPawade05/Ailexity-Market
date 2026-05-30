"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  category: string | null;
  price: number;
  _count: { channelFollows: number };
  owner: { name: string };
}

interface CategoryGroup {
  category: string;
  channels: Channel[];
}

export default function CommunitiesPage() {
  const { user, loading } = useAuth();
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    fetch("/api/channels")
      .then((res) => res.json())
      .then((channels: Channel[]) => {
        // Group channels by category
        const groups: { [key: string]: Channel[] } = {};
        channels.forEach((channel) => {
          const cat = channel.category || "General";
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(channel);
        });

        const sortedGroups = Object.entries(groups)
          .map(([category, channels]) => ({ category, channels }))
          .sort((a, b) => a.category.localeCompare(b.category));

        setCategoryGroups(sortedGroups);
        setAvailableCategories(["All", ...sortedGroups.map((item) => item.category)]);
        setLoadingChannels(false);
      })
      .catch((err) => {
        console.error("Failed to fetch channels:", err);
        setLoadingChannels(false);
      });
  }, [loading, user]);

  if (loading || loadingChannels) {
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900">Communities</h1>
        <p className="mt-2 text-zinc-600">Discover and join communities by category</p>
        <div className="mt-4">
          <Link
            href="/channel/new"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Create Community
          </Link>
        </div>
      </div>

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
          <p className="text-zinc-500">No communities yet. Be the first to create one!</p>
        </div>
      ) : (
        <div className="space-y-12">
          {categoryGroups
            .filter((group) => selectedCategory === "All" || group.category === selectedCategory)
            .map((group) => (
              <div key={group.category}>
                <h2 className="mb-4 text-xl font-bold text-zinc-900">{group.category}</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {group.channels.map((channel) => (
                    <Link
                      key={channel.id}
                      href={`/channel/${channel.id}`}
                      className="group block overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {channel.avatarUrl ? (
                            <img
                              src={channel.avatarUrl}
                              alt={channel.name}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-800">
                              {channel.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-amber-600">
                              {channel.name}
                            </h3>
                            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                              {channel.category || "General"}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-zinc-500">by {channel.owner.name}</p>
                          <p className="mt-2 text-sm text-zinc-600 line-clamp-2">
                            {channel.description || "No description"}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            <span className="rounded-full bg-zinc-100 px-2 py-1">{channel._count.channelFollows} members</span>
                            <span className="font-medium text-amber-600">
                              {channel.price && channel.price > 0 ? `$${channel.price}` : "Free"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}