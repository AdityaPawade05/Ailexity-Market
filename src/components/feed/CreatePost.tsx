"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { uploadFile } from "@/lib/upload";

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

type Media = { url: string; kind: "image" | "video" };

const MAX_FILE_SIZE = 50 * 1024 * 1024; // matches /api/upload

export function CreatePost({ onPost }: { onPost: (post: Post) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<Media | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close on Escape, like Facebook's composer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus the textarea when the composer opens.
  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  function openComposer(picker?: "image" | "video") {
    setError("");
    setOpen(true);
    if (picker === "image") imageInputRef.current?.click();
    if (picker === "video") videoInputRef.current?.click();
  }

  async function handleFile(file: File, kind: "image" | "video") {
    setError("");

    if (!file.type.startsWith(`${kind}/`)) {
      setError(kind === "image" ? "Please choose an image file." : "Please choose a video file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large (max 50 MB).");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file, kind);
      setMedia({ url, kind });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      handleFile(file, "image");
    } else if (file.type.startsWith("video/")) {
      handleFile(file, "video");
    } else {
      setError("Only photos and videos can be posted.");
    }
  }

  function resetComposer() {
    setContent("");
    setMedia(null);
    setError("");
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (posting || uploading) return;
    if (!content.trim() && !media) return;

    setPosting(true);
    setError("");
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: media?.kind === "image" ? media.url : undefined,
          attachmentUrl: media?.kind === "video" ? media.url : undefined,
        }),
      });
      const post = await res.json();
      if (!res.ok) {
        setError(post.error || "Failed to post. Please try again.");
        return;
      }
      onPost({ ...post, liked: false, likesCount: 0, commentsCount: 0 });
      resetComposer();
      setOpen(false);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  const avatar = (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-lg font-semibold text-amber-800">
      {user?.avatar ? (
        <img src={user.avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        user?.name?.charAt(0) || "?"
      )}
    </div>
  );

  return (
    <>
      {/* Hidden pickers — outside the modal so the collapsed buttons can trigger them */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file, "image");
          e.target.value = "";
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file, "video");
          e.target.value = "";
        }}
      />

      {/* ─── Collapsed card (Facebook-style) ─── */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          {avatar}
          <button
            type="button"
            onClick={() => openComposer()}
            className="flex-1 rounded-full bg-zinc-100 px-5 py-2.5 text-left text-[15px] text-zinc-500 transition-colors hover:bg-zinc-200"
          >
            What&apos;s on your mind{user?.name ? `, ${user.name.split(" ")[0]}` : ""}?
          </button>
        </div>
        <div className="mt-3 flex border-t border-zinc-100 pt-2">
          <button
            type="button"
            onClick={() => openComposer("image")}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 11a2 2 0 110-4 2 2 0 010 4zm-2.5 7l3.5-4.5 2.5 3 3.5-4.5L20 18H6z" />
            </svg>
            Photo
          </button>
          <button
            type="button"
            onClick={() => openComposer("video")}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            <svg className="h-6 w-6 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z" />
            </svg>
            Reel / Video
          </button>
        </div>
      </div>

      {/* ─── Composer modal ─── */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative border-b border-zinc-200 px-5 py-4 text-center">
              <h2 className="text-base font-bold text-zinc-900">Create post</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div
              className="flex-1 overflow-y-auto px-5 py-4"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="flex items-center gap-3">
                {avatar}
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{user?.name || "You"}</p>
                  <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Public
                  </span>
                </div>
              </div>

              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`What's on your mind${user?.name ? `, ${user.name.split(" ")[0]}` : ""}?`}
                rows={media ? 3 : 5}
                className="mt-3 w-full resize-none border-0 p-0 text-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-0"
              />

              {/* Media area */}
              {uploading ? (
                <div className="mt-2 flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                  <p className="text-sm font-medium text-zinc-500">Uploading…</p>
                </div>
              ) : media ? (
                <div className="relative mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                  {media.kind === "image" ? (
                    <img src={media.url} alt="Preview" className="max-h-80 w-full object-contain" />
                  ) : (
                    <video
                      src={media.url}
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-80 w-full bg-black"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setMedia(null)}
                    aria-label="Remove media"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow transition-colors hover:bg-white"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className={`mt-2 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors ${
                    dragging
                      ? "border-amber-400 bg-amber-50"
                      : "border-zinc-200 bg-zinc-50 hover:border-amber-300 hover:bg-amber-50/50"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-zinc-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-zinc-700">Add photos/videos</p>
                  <p className="text-xs text-zinc-400">or drag and drop</p>
                </button>
              )}

              {error && (
                <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-200 px-5 py-4">
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2.5">
                <span className="text-sm font-semibold text-zinc-700">Add to your post</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploading}
                    title="Photo"
                    className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-zinc-100 disabled:opacity-50"
                  >
                    <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 11a2 2 0 110-4 2 2 0 010 4zm-2.5 7l3.5-4.5 2.5 3 3.5-4.5L20 18H6z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploading}
                    title="Reel / Video"
                    className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-zinc-100 disabled:opacity-50"
                  >
                    <svg className="h-6 w-6 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z" />
                    </svg>
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={posting || uploading || (!content.trim() && !media)}
                className="mt-3 w-full rounded-lg bg-amber-500 py-2.5 font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
              >
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
