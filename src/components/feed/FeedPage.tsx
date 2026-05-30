"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { CreatePost } from "./CreatePost";
import { PostCard } from "./PostCard";
import { PopularUsers } from "./PopularUsers";

type Post = {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null; bio: string | null };
  liked: boolean;
  likesCount: number;
  commentsCount: number;
};

export function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<"all" | "following">("all");
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(() => {
    fetch(`/api/feed?filter=${filter}`)
      .then((res) => res.json())
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  function handleNewPost(post: Post) {
    setPosts((prev) => [post, ...prev]);
  }

  function handleDeletePost(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        {/* Feed Header */}
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
            <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
            <h2 className="font-semibold text-zinc-900">Feed</h2>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                filter === "all"
                  ? "bg-amber-100 text-amber-800"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("following")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                filter === "following"
                  ? "bg-amber-100 text-amber-800"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Following
            </button>
          </div>
        </div>

        {/* Create Post */}
        <CreatePost onPost={handleNewPost} />

        {/* Posts Feed */}
        {loading ? (
          <div className="mt-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-zinc-200" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
            <p className="text-zinc-600">
              {filter === "following"
                ? "Follow users to see their posts here."
                : "No posts yet. Be the first to share!"}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onDelete={handleDeletePost}
                onUpdate={fetchFeed}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Sidebar - Popular Users */}
      <aside className="hidden w-72 shrink-0 xl:block">
        <PopularUsers />
      </aside>
    </div>
  );
}
