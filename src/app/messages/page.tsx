"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type Conversation = {
  user: { id: string; name: string; avatar: string | null };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

export default function MessagesInboxPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!user) return;
    fetch("/api/messages")
      .then((res) => res.json())
      .then((data) => setConversations(data.conversations || []))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-zinc-900">Messages</h1>

      {conversations.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <p className="text-zinc-600">No conversations yet.</p>
          <p className="mt-1 text-sm text-zinc-400">Visit someone&apos;s profile and hit Message to start one.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {conversations.map((c) => (
            <Link
              key={c.user.id}
              href={`/messages/${c.user.id}`}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-amber-200 hover:shadow-md transition-all"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 to-orange-500 font-bold text-white">
                {c.user.avatar ? (
                  <img src={c.user.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  c.user.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${c.unreadCount > 0 ? "font-bold text-zinc-900" : "font-medium text-zinc-800"}`}>
                    {c.user.name}
                  </p>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {new Date(c.lastMessageAt).toLocaleDateString()}
                  </span>
                </div>
                <p className={`truncate text-sm ${c.unreadCount > 0 ? "font-semibold text-zinc-700" : "text-zinc-500"}`}>
                  {c.lastMessage}
                </p>
              </div>
              {c.unreadCount > 0 && (
                <span className="shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
                  {c.unreadCount > 9 ? "9+" : c.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
