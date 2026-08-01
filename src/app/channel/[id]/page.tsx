"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/context/AuthContext";
import { PostCard } from "@/components/feed/PostCard";
import { uploadFile } from "@/lib/upload";

type Channel = {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  avatarUrl: string | null;
  category: string | null;
  price: number;
  followersCount: number;
  postsCount: number;
  owner: { id: string; name: string; avatar: string | null };
  members: Array<{ id: string; name: string; avatar: string | null }>;
  isFollowing: boolean;
};

type Post = {
  id: string;
  content: string;
  imageUrl: string | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  author: { id: string; name: string; avatar: string | null; bio: string | null };
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  liked: boolean;
};

export default function ChannelPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading, walletBalance, refreshWallet } = useAuth();

  const channelId = String(params.id || "");
  const [channel, setChannel] = useState<Channel | null>(null);
  const [feed, setFeed] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<Post[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatText, setChatText] = useState("");
  const [chatAttachmentUrl, setChatAttachmentUrl] = useState("");
  const [chatAttachmentType, setChatAttachmentType] = useState("");

  const [following, setFollowing] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImageUrl, setPostImageUrl] = useState("");
  const [posting, setPosting] = useState(false);
  const [chatPosting, setChatPosting] = useState(false);
  const [tab, setTab] = useState<"feed" | "chat">("feed");

  const fetchChannel = useCallback(() => {
    fetch(`/api/channels/${channelId}`)
      .then((r) => r.json())
      .then((data) => {
        const ch: Channel = data.channel || data;
        setChannel(ch);
        setFollowing(!!ch.isFollowing || !!ch.isFollowing);
      })
      .catch(() => router.push("/"));
  }, [channelId, router]);

  const fetchFeed = useCallback(() => {
    setFeedLoading(true);
    fetch(`/api/channels/${channelId}/feed`)
      .then((r) => r.json())
      .then((data) => setFeed(Array.isArray(data) ? data : []))
      .finally(() => setFeedLoading(false));
  }, [channelId]);

  const fetchChat = useCallback(() => {
    setChatLoading(true);
    fetch(`/api/channels/${channelId}/chat`)
      .then((r) => r.json())
      .then((data) => setChatMessages(Array.isArray(data) ? data : []))
      .finally(() => setChatLoading(false));
  }, [channelId]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (!channelId) return;
    fetchChannel();
    fetchFeed();
    fetchChat();
  }, [loading, user, channelId, fetchChannel, fetchFeed, fetchChat, router]);

  useEffect(() => {
    if (tab !== "chat") return;
    const interval = setInterval(() => {
      fetchChat();
    }, 2500);
    return () => clearInterval(interval);
  }, [tab, fetchChat]);

  async function handlePurchaseChannel() {
    if (!user) {
      router.push("/login");
      return;
    }
    setPurchasing(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/purchase`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Purchase failed");

      setFollowing(true);
      fetchChannel();
      await refreshWallet();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to join community");
    } finally {
      setPurchasing(false);
    }
  }

  async function toggleChannelFollow() {
    if (!user) return;
    const res = await fetch("/api/channel-follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    });
    const data = await res.json();
    if (res.ok) setFollowing(!!data.following);
    fetchChannel();
  }

  async function handleDeleteCommunity() {
    if (!user || user.id !== channel?.owner.id) return;
    if (!window.confirm("Are you sure you want to delete this community? This action cannot be undone and will delete all posts, members, and data associated with it.")) {
      return;
    }
    
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete");
      router.push("/");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete community");
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!postContent.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postContent.trim(), imageUrl: postImageUrl || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setPostContent("");
      setPostImageUrl("");
      fetchFeed();
    } catch {
      // ignore for now
    } finally {
      setPosting(false);
    }
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    const message = chatText.trim();
    const attachment = chatAttachmentUrl.trim();
    if (!message && !attachment) return;
    if (chatPosting) return;
    setChatPosting(true);

    try {
      const res = await fetch(`/api/channels/${channelId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: message || "",
          attachmentUrl: attachment || undefined,
          attachmentType: chatAttachmentType || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send");
      setChatText("");
      setChatAttachmentUrl("");
      setChatAttachmentType("");
      setChatMessages((prev) => [...prev, data]);
    } catch {
      // ignore for now
    } finally {
      setChatPosting(false);
    }
  }

  if (loading || !user) return null;

  if (!channel) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-zinc-600">Loading channel...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/"
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          ← Back to Home
        </Link>
        <div className="flex items-center gap-2">
          {user.id === channel?.owner.id && (
            <>
              <Link
                href={`/channel/${channelId}/edit`}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Edit
              </Link>
              <button
                onClick={handleDeleteCommunity}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
              >
                Delete
              </button>
            </>
          )}
          <button
            onClick={channel?.price && channel.price > 0 && !following ? handlePurchaseChannel : toggleChannelFollow}
            disabled={purchasing}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
              following ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200" : "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
            }`}
          >
            {purchasing ? "Processing..." : following ? "Following" : (channel?.price && channel.price > 0) ? `Join for $${channel.price}` : "Follow"}
          </button>
        </div>
      </div>

      {!following && user.id !== channel?.owner.id && channel?.price > 0 && walletBalance !== null && walletBalance < channel.price && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          ⚠️ Your wallet balance (${walletBalance.toFixed(2)}) is below the price to join this community (${channel.price.toFixed(2)}).{" "}
          <Link href="/business/balances" className="font-semibold underline hover:text-amber-900">
            Top up your wallet
          </Link>{" "}
          to join.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="relative h-40 w-full bg-gradient-to-r from-amber-100 via-orange-50 to-zinc-50">
          {channel.coverImageUrl ? (
             
            <img src={channel.coverImageUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
          ) : null}
        </div>
        <div className="px-6 pb-6 pt-0">
          <div className="relative -mt-12 mb-3">
            <div className="relative inline-block">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-amber-100 shadow-sm">
                {channel.avatarUrl ? (
                   
                  <img src={channel.avatarUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                ) : (
                  <div className="text-3xl font-bold text-amber-800">
                    {channel.name?.charAt(0) ?? "C"}
                  </div>
                )}
              </div>
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-500 ring-4 ring-white" />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-zinc-900">{channel.name}</h1>
              {channel.category && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  {channel.category}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Owned by {channel.owner.name} · {channel.followersCount} followers · {channel.postsCount} posts
            </p>
            {channel.description && (
              <p className="mt-3 text-sm text-zinc-600">{channel.description}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="text-xs text-zinc-500">Members</p>
              {channel.members?.length ? (
                <div className="flex -space-x-2"> 
                  {channel.members.slice(0, 8).map((member) => (
                    <img
                      key={member.id}
                      src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=FBBF24&color=92400E`}
                      alt={member.name}
                      className="h-7 w-7 rounded-full border border-white bg-zinc-100 object-cover"
                    />
                  ))}
                  {channel.members.length > 8 && (
                    <span className="h-7 min-w-[1.75rem] rounded-full border border-white bg-zinc-100 px-1.5 text-xs text-zinc-600">
                      +{channel.members.length - 8}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-zinc-400">No members yet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 border-b border-zinc-200 pb-2">
        {([
          ["feed", "Feed"],
          ["chat", "Chat"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold ${
              tab === key
                ? "border-b-2 border-amber-500 text-amber-700"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "feed" ? (
        <div className="mt-4 space-y-4">
          {following || user?.id === channel?.owner.id ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <form onSubmit={handleCreatePost} className="space-y-3">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share something in this community..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-500"
                />
                {postImageUrl && (
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm mb-2">
                    <span className="truncate text-zinc-600 max-w-[80%] text-xs font-medium">
                      File attached (ready to upload)
                    </span>
                    <button
                      type="button"
                      onClick={() => setPostImageUrl("")}
                      className="font-medium text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <label 
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition"
                  >
                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" />
                    </svg>
                    Attach Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const url = await uploadFile(file, "image");
                          setPostImageUrl(url);
                        } catch {
                          // ignore silently; user can try again
                        }
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={posting || !postContent.trim()}
                    className="rounded-lg bg-amber-500 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    {posting ? "Posting..." : "Post"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-amber-900">Join to Participate</h3>
              <p className="mt-1 text-sm text-amber-700">You must join this community to create posts.</p>
            </div>
          )}

          <div className="space-y-4">
            {feedLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-56 animate-pulse rounded-xl bg-zinc-100" />
                ))}
              </div>
            ) : feed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
                No posts yet. Be the first to share.
              </div>
            ) : (
              feed.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  currentUserId={user.id}
                  onDelete={() => fetchFeed()}
                  onUpdate={() => fetchFeed()}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <div className="max-h-[50vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4">
            {chatLoading ? (
              <p className="text-sm text-zinc-500">Loading chat...</p>
            ) : chatMessages.length === 0 ? (
              <p className="text-sm text-zinc-500">No messages yet in chat. Start the conversation!</p>
            ) : (
              <div className="space-y-2">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.author.id === user.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                        msg.author.id === user.id
                          ? "bg-amber-500 text-white"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      <p className="font-semibold text-xs uppercase tracking-wide text-zinc-500">
                        {msg.author.name}
                      </p>
                      {msg.content && <p className="mt-1">{msg.content}</p>}
                      {msg.attachmentUrl && (
                        <div className="mt-3">
                          {msg.attachmentType?.includes("image") ? (
                            <img src={msg.attachmentUrl} alt="Attachment" className="max-h-60 rounded-lg object-contain shadow-sm bg-white" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                          ) : msg.attachmentType?.includes("pdf") ? (
                            <a href={msg.attachmentUrl} download={`Document.pdf`} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white/90 px-3 py-2 text-sm font-medium text-blue-600 shadow-sm transition hover:bg-white hover:text-blue-700">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              Download PDF
                            </a>
                          ) : (
                            <a href={msg.attachmentUrl} download={`Attachment`} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white/90 px-3 py-2 text-sm font-medium text-blue-600 shadow-sm transition hover:bg-white hover:text-blue-700">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                              Download File
                            </a>
                          )}
                        </div>
                      )}
                      <p className={`mt-1 text-xs ${msg.author.id === user.id ? "text-amber-100" : "text-zinc-500"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {following || user?.id === channel?.owner.id ? (
            <form onSubmit={handleSendChat} className="flex flex-col gap-2">
              {chatAttachmentUrl ? (
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm shadow-sm">
                  <span className="truncate text-zinc-600 max-w-[80%]">
                    {chatAttachmentUrl.startsWith("/uploads/")
                      ? `File attached (${chatAttachmentType || "file"})`
                      : `URL: ${chatAttachmentUrl}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setChatAttachmentUrl(""); setChatAttachmentType(""); }}
                    className="font-medium text-red-500 hover:text-red-700 ml-4 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              <div className="flex gap-2 items-center">
                <label 
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 shrink-0 shadow-sm transition-colors"
                  title="Attach a file"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadFile(file, "chat");
                        setChatAttachmentUrl(url);
                        setChatAttachmentType(file.type);
                      } catch {
                        // ignore silently; user can try again
                      }
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>

                <input
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm outline-none shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
                
                <button
                  type="submit"
                  disabled={chatPosting || (!chatText.trim() && !chatAttachmentUrl)}
                  className="h-11 rounded-xl bg-amber-500 px-6 font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  {chatPosting ? "..." : "Send"}
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-amber-900">Join to Chat</h3>
              <p className="mt-1 text-sm text-amber-700">You must join this community to send messages.</p>
            </div>
          )}
        </div>
      )}
  </div>
  );
}

