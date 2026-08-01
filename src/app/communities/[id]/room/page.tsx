"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface RoomMessage {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  author: { name: string; username: string | null; avatar: string | null };
}

const POLL_INTERVAL_MS = 4000;

export default function CommunityRoomPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const communityId = params.id as string;

  const [communityName, setCommunityName] = useState("");
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  // Track the newest message timestamp so polling only pulls deltas.
  const lastSeenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (authLoading || !user) return;

    let active = true;

    async function load(initial: boolean) {
      try {
        const after = lastSeenRef.current;
        const url = `/api/communities/${communityId}/room${
          after && !initial ? `?after=${encodeURIComponent(after)}` : ""
        }`;
        const res = await fetch(url, { credentials: "include" });

        if (res.status === 403) {
          if (active) {
            setError("You need an active subscription to enter this room.");
            setLoading(false);
          }
          return;
        }
        if (!res.ok) throw new Error("Failed to load room");

        const data = await res.json();
        if (!active) return;

        setCommunityName(data.community.name);
        setCurrentUserId(data.currentUserId);

        if (data.messages.length > 0) {
          setMessages((prev) => {
            const merged = initial ? data.messages : [...prev, ...data.messages];
            return merged;
          });
          lastSeenRef.current = data.messages[data.messages.length - 1].createdAt;
        }
      } catch (err: any) {
        if (active && initial) setError(err.message || "Failed to load room");
      } finally {
        if (active && initial) setLoading(false);
      }
    }

    load(true);
    const timer = setInterval(() => load(false), POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [authLoading, user, communityId, router]);

  // Keep the view pinned to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/communities/${communityId}/room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message");
      }
      const { message } = await res.json();
      setMessages((prev) => [...prev, message]);
      lastSeenRef.current = message.createdAt;
      setDraft("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading room…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-600 text-center">{error}</p>
        <button
          onClick={() => router.push(`/communities/${communityId}`)}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Back to community
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-2xl flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{communityName}</h1>
            <p className="text-xs text-gray-500">Members room</p>
          </div>
          <button
            onClick={() => router.push(`/communities/${communityId}/access`)}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            ← Access
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 mt-12">
              No messages yet. Say hello 👋
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.authorId === currentUserId;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"}`}>
                    {!mine && (
                      <p className="text-xs text-gray-500 mb-1 ml-1">
                        {m.author.name}
                      </p>
                    )}
                    <div
                      className={`px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                        mine
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white text-gray-800 shadow rounded-bl-sm"
                      }`}
                    >
                      {m.content}
                    </div>
                    <p
                      className={`text-[10px] text-gray-400 mt-1 ${
                        mine ? "text-right mr-1" : "ml-1"
                      }`}
                    >
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form
          onSubmit={sendMessage}
          className="bg-white border-t px-4 py-3 flex items-center gap-3"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            maxLength={2000}
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="px-5 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 font-medium"
          >
            {sending ? "…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
