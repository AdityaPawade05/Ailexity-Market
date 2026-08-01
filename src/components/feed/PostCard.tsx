"use client";

import { useState } from "react";
import Link from "next/link";
import { UserHoverCard } from "./UserHoverCard";

type Post = {
  id: string;
  content: string;
  imageUrl: string | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null; bio: string | null };
  liked: boolean;
  likesCount: number;
  commentsCount: number;
};

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

export function PostCard({
  post,
  currentUserId,
  onDelete,
  onUpdate,
}: {
  post: Post;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onUpdate: () => void;
}) {
  const [liked, setLiked] = useState(post.liked);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<{ id: string; content: string; user: { name: string }; createdAt: string; attachmentUrl?: string | null; attachmentType?: string | null }[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentAttachmentUrl, setCommentAttachmentUrl] = useState("");
  const [commentAttachmentType, setCommentAttachmentType] = useState("");
  const [commenting, setCommenting] = useState(false);

  async function handleLike() {
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikesCount(data.count);
      }
    } catch (err) {
      console.error("Failed to like post:", err);
    }
  }

  async function loadComments() {
    if (!showComments && comments === null) {
      try {
        const res = await fetch(`/api/posts/${post.id}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(Array.isArray(data) ? data : []);
        } else {
          setComments([]);
        }
      } catch (err) {
        console.error("Failed to load comments:", err);
        setComments([]);
      }
    }
    setShowComments(!showComments);
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() && !commentAttachmentUrl) return;
    setCommenting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: commentText.trim(),
          attachmentUrl: commentAttachmentUrl || undefined,
          attachmentType: commentAttachmentType || undefined,
        }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...(prev || []), newComment]);
        setCommentText("");
        setCommentAttachmentUrl("");
        setCommentAttachmentType("");
        onUpdate();
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setCommenting(false);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/feed?post=${post.id}`;
    if (navigator.share) {
      await navigator.share({
        title: `Post by ${post.author.name}`,
        text: post.content.slice(0, 100),
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  }

  const isAuthor = currentUserId === post.author.id;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <UserHoverCard user={post.author}>
          <Link
            href={`/profile/${post.author.id}`}
            className="group block"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-lg font-bold text-amber-800 shadow-sm ring-2 ring-transparent group-hover:ring-amber-200 transition-all">
              {post.author.avatar ? (
                 
                <img src={post.author.avatar} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" crossOrigin="anonymous" referrerPolicy="no-referrer" />
              ) : (
                post.author.name.charAt(0)
              )}
            </div>
          </Link>
        </UserHoverCard>
        <div className="min-w-0 flex-1 mt-0.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
              <UserHoverCard user={post.author}>
                <Link
                  href={`/profile/${post.author.id}`}
                  className="font-bold text-zinc-900 hover:text-amber-600 transition-colors"
                >
                  {post.author.name}
                </Link>
              </UserHoverCard>
              <Link href={`/profile/${post.author.id}`} className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors">
                @{post.author.name.replace(/\s/g, "").toLowerCase()}
              </Link>
            </div>
            <span className="text-sm text-zinc-400">{timeAgo(post.createdAt)}</span>
          </div>
          {post.content && (
            <p className="mt-2 whitespace-pre-wrap text-zinc-700">{post.content}</p>
          )}
          {post.attachmentUrl && post.attachmentType?.startsWith("video") && (
            <div className="mt-3 overflow-hidden rounded-lg bg-black">
              <video
                src={post.attachmentUrl}
                controls
                playsInline
                preload="metadata"
                className="max-h-[600px] w-full"
              />
            </div>
          )}
          {post.imageUrl && (
            <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-lg bg-zinc-100">
              { }
              <img 
                src={post.imageUrl} 
                alt="" 
                className="h-full w-full object-cover" 
                crossOrigin="anonymous" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement!.innerHTML = `<div class="flex h-full items-center justify-center"><svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af' class="h-12 w-12"><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L28 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/></svg></div>`;
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
            <div className="flex items-center w-full gap-1 sm:gap-2">
              <button
                onClick={handleLike}
                className={`group flex flex-1 sm:flex-none items-center justify-center sm:justify-start gap-2 rounded-xl py-2 px-3 text-sm font-medium transition-all ${
                  liked ? "text-rose-500 bg-rose-50/50" : "text-zinc-500 hover:bg-rose-50 hover:text-rose-500"
                }`}
              >
                <svg className={`h-5 w-5 ${liked ? "fill-current" : "stroke-current fill-none"} transition-transform group-active:scale-75`} viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span className={liked ? "font-bold" : ""}>{likesCount > 0 ? likesCount : "Like"}</span>
              </button>

              <button
                onClick={loadComments}
                className="group flex flex-1 sm:flex-none items-center justify-center sm:justify-start gap-2 rounded-xl py-2 px-3 text-sm font-medium text-zinc-500 hover:bg-blue-50 hover:text-blue-500 transition-all"
              >
                <svg className="h-5 w-5 stroke-current fill-none transition-transform group-active:scale-75" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
                <span>{showComments && comments ? comments.length : post.commentsCount > 0 ? post.commentsCount : "Comment"}</span>
              </button>

              <button
                onClick={handleShare}
                className="group flex flex-1 sm:flex-none items-center justify-center sm:justify-start gap-2 rounded-xl py-2 px-3 text-sm font-medium text-zinc-500 hover:bg-green-50 hover:text-green-500 transition-all"
              >
                <svg className="h-5 w-5 stroke-current fill-none transition-transform group-active:scale-75" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                <span className="hidden sm:inline">Share</span>
              </button>

              {isAuthor && (
                <button
                  onClick={async () => {
                    if (confirm("Delete this post?")) {
                      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
                      if (res.ok) onDelete(post.id);
                    }
                  }}
                  className="group ml-auto flex items-center justify-center rounded-xl py-2 px-3 text-sm font-medium text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all"
                  title="Delete post"
                >
                  <svg className="h-5 w-5 stroke-current fill-none transition-transform group-active:scale-75" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Comments */}
          {showComments && comments && (
            <div className="mt-4 border-t border-zinc-100 pt-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 py-2">
                  <span className="font-medium text-zinc-900">{c.user.name}:</span>
                  <div>
                    <span className="text-zinc-600">{c.content}</span>
                    {c.attachmentUrl && (
                      <div className="mt-2">
                        {c.attachmentType?.includes("image") ? (
                          <img src={c.attachmentUrl} alt="Attachment" className="max-h-40 rounded-lg object-contain border border-zinc-200" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                        ) : (
                          <a href={c.attachmentUrl} download className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-blue-600 shadow-sm hover:bg-zinc-100 transition">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            View Attachment
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <form onSubmit={handleComment} className="mt-4 flex flex-col gap-2">
                {commentAttachmentUrl && (
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs">
                    <span className="truncate text-zinc-600 max-w-[80%]">
                      {commentAttachmentUrl.startsWith("data:") 
                        ? `File attached (${commentAttachmentType || "Unknown"})` 
                        : `URL attached`}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setCommentAttachmentUrl(""); setCommentAttachmentType(""); }}
                      className="font-medium text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <label 
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 shrink-0 transition-colors"
                    title="Attach a file"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setCommentAttachmentType(file.type);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCommentAttachmentUrl(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={commenting || (!commentText.trim() && !commentAttachmentUrl)}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    Post
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
