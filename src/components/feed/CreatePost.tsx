"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

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

export function CreatePost({ onPost }: { onPost: (post: Post) => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "upload">("url");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), imageUrl: imageUrl || undefined }),
      });
      const post = await res.json();
      if (res.ok) {
        onPost({ ...post, liked: false, likesCount: 0, commentsCount: 0 });
        setContent("");
        setImageUrl("");
        setInputMode("url");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImageUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/30 text-lg font-semibold text-amber-800">
          {user?.name?.charAt(0) || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Your next post could blow up..."
            rows={3}
            className="w-full resize-none rounded-lg border border-zinc-200 px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />

          {/* Image Input - Toggle between URL and Upload */}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode("url")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                inputMode === "url"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              URL
            </button>
            <button
              type="button"
              onClick={() => setInputMode("upload")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                inputMode === "upload"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              Upload
            </button>
          </div>

          {/* URL Input */}
          {inputMode === "url" && (
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Image URL (optional)"
              className="mt-2 w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm placeholder-zinc-400 focus:border-amber-500 focus:outline-none"
            />
          )}

          {/* File Upload */}
          {inputMode === "upload" && (
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
              >
                {imageUrl ? "📷 Image selected - Click to change" : "📤 Click to upload image"}
              </button>
            </div>
          )}

          {/* Image Preview */}
          {imageUrl && (
            <div className="mt-2 relative">
              <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L28 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E";
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setImageUrl("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white p-1 hover:bg-red-600 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}
