"use client";

import { useCallback, useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const POLL_INTERVAL_MS = 4000;

type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
};

type OtherUser = { id: string; name: string; avatar: string | null };

export default function MessageThreadPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: otherId } = use(params);
  const { user, loading: authLoading, refreshUnreadCount } = useAuth();
  const router = useRouter();

  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const lastSeenRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (initial: boolean) => {
      const url = !initial && lastSeenRef.current
        ? `/api/messages/${otherId}?after=${encodeURIComponent(lastSeenRef.current)}`
        : `/api/messages/${otherId}`;
      const res = await fetch(url);
      if (!res.ok) {
        if (initial) setNotFound(true);
        return;
      }
      const data = await res.json();
      if (initial) setOtherUser(data.otherUser);
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages((prev) => (initial ? data.messages : [...prev, ...data.messages]));
        lastSeenRef.current = data.messages[data.messages.length - 1].createdAt;
      }
      refreshUnreadCount();
      if (initial) setLoading(false);
    },
    [otherId, refreshUnreadCount]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!user) return;
    load(true);
    const interval = setInterval(() => load(false), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router, otherId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/messages/${otherId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send");
        return;
      }
      setMessages((prev) => [...prev, data.message]);
      lastSeenRef.current = data.message.createdAt;
      setInput("");
    } catch {
      setError("Something went wrong");
    } finally {
      setSending(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !otherUser) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-zinc-900">User not found</h2>
        <Link href="/messages" className="mt-4 inline-block text-amber-600 hover:text-amber-700">
          Back to Messages
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-2xl flex-col px-4 sm:px-6">
      <div className="flex items-center gap-3 border-b border-zinc-200 py-4">
        <Link href="/messages" className="text-zinc-500 hover:text-zinc-800">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 to-orange-500 font-bold text-white text-sm">
          {otherUser.avatar ? (
            <img src={otherUser.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            otherUser.name.charAt(0).toUpperCase()
          )}
        </div>
        <Link href={`/profile/${otherUser.id}`} className="font-semibold text-zinc-900 hover:text-amber-600">
          {otherUser.name}
        </Link>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-zinc-500">Say hello 👋</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    mine ? "bg-amber-500 text-white" : "bg-zinc-100 text-zinc-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-amber-100" : "text-zinc-400"}`}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-rose-600 pb-2">{error}</p>}

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-zinc-200 py-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Write a message..."
          className="flex-1 rounded-full border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
