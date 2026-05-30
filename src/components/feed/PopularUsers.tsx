"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserHoverCard } from "./UserHoverCard";

type User = {
  id: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  following: boolean;
  followersCount: number;
  productsCount: number;
};

export function PopularUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/popular")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="font-semibold text-zinc-900">Popular users</h3>
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-24 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-zinc-900">Popular users</h3>
      <Link href="/products" className="mt-1 block text-sm text-amber-600 hover:text-amber-700">
        See all
      </Link>
      <div className="mt-4 space-y-3">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-zinc-50">
            <UserHoverCard user={user}>
              <div className="flex cursor-pointer items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-amber-100">
                    {user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-lg font-semibold text-amber-800">
                        {user.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900">{user.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {user.bio || `${user.productsCount} products · ${user.followersCount} followers`}
                  </p>
                </div>
              </div>
            </UserHoverCard>
            <FollowButton userId={user.id} initialFollowing={user.following} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FollowButton({ userId, initialFollowing }: { userId: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) setFollowing(data.following);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
        following
          ? "bg-zinc-100 text-zinc-600"
          : "bg-amber-500 text-white hover:bg-amber-600"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
