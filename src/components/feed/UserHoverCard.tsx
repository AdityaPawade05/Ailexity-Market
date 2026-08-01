"use client";

import { useState, useRef, useEffect } from "react";

type User = { id: string; name: string; avatar: string | null; bio?: string | null };

export function UserHoverCard({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !user.id) return;
    fetch(`/api/follow?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => setFollowing(data.following));
  }, [open, user.id]);

  async function handleFollow(e: React.MouseEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok) setFollowing(data.following);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      ref={cardRef}
    >
      {children}
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
          style={{ minHeight: 140 }}
        >
          <div className="h-16 bg-gradient-to-r from-amber-400 to-orange-400" />
          <div className="relative px-4 pb-4">
            <div className="-mt-8 flex items-end gap-3">
              <div className="flex h-16 w-16 shrink-0 overflow-hidden rounded-full border-4 border-white bg-amber-100">
                {user.avatar ? (
                   
                  <img src={user.avatar} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-amber-800">
                    {user.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 pb-1">
                <p className="font-semibold text-zinc-900">{user.name}</p>
                {user.bio && (
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{user.bio}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleFollow}
              disabled={loading}
              className={`mt-4 w-full rounded-lg py-2 text-sm font-medium ${
                following
                  ? "bg-zinc-100 text-zinc-600"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
