"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { uploadFile } from "@/lib/upload";

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  imageUrl: string | null;
  fileUrl: string | null;
  audioUrl: string | null;
  duration: string | null;
  pages: number | null;
  published: boolean;
  sellerId: string;
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    type: "ebook" as "ebook" | "course",
    imageUrl: "",
    fileUrl: "",
    audioUrl: "",
    duration: "",
    pages: "",
    published: false,
  });

  const [fileMode, setFileMode] = useState<"url" | "upload">("url");
  const [audioMode, setAudioMode] = useState<"url" | "upload">("url");

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((product: Product) => {
        const isOwner = user?.id === product.sellerId;
        const isAdmin = user?.role === "admin";
        if (!isOwner && !isAdmin) {
          router.push("/dashboard");
          return;
        }
        setForm({
          title: product.title,
          description: product.description,
          price: product.price.toString(),
          type: product.type as "ebook" | "course",
          imageUrl: product.imageUrl || "",
          fileUrl: product.fileUrl || "",
          audioUrl: product.audioUrl || "",
          duration: product.duration || "",
          pages: product.pages?.toString() || "",
          published: product.published,
        });
      })
      .catch(() => router.push("/dashboard"))
      .finally(() => setFetching(false));
  }, [params.id, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          duration: form.duration || undefined,
          pages: form.pages ? parseInt(form.pages) : undefined,
          imageUrl: form.imageUrl || undefined,
          fileUrl: form.fileUrl || undefined,
          audioUrl: form.audioUrl || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (fetching || !user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/dashboard" className="text-sm text-amber-600 hover:text-amber-700">
        ← Back to Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-zinc-900">Edit Product</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        {error && (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-zinc-700">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            rows={4}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as "ebook" | "course" })}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
          >
            <option value="ebook">Ebook</option>
            <option value="course">Course</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">Price ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
            className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
          />
        </div>
        {form.type === "course" && (
          <div>
            <label className="block text-sm font-medium text-zinc-700">Duration</label>
            <input
              type="text"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
            />
          </div>
        )}
        {form.type === "ebook" && (
          <div>
            <label className="block text-sm font-medium text-zinc-700">Pages</label>
            <input
              type="number"
              min="0"
              value={form.pages}
              onChange={(e) => setForm({ ...form, pages: e.target.value })}
              className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-zinc-700">Cover Image URL</label>
          <input
            type="url"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Content File (PDF / Course)</label>
          <div className="flex gap-4 mb-2">
            <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
              <input type="radio" checked={fileMode === 'url'} onChange={() => setFileMode('url')} className="text-amber-500 focus:ring-amber-500" /> Enter External URL
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
              <input type="radio" checked={fileMode === 'upload'} onChange={() => setFileMode('upload')} className="text-amber-500 focus:ring-amber-500" /> Upload File (.pdf)
            </label>
          </div>
          {fileMode === "url" ? (
            <input
              type="url"
              value={form.fileUrl}
              onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
              placeholder="https://link-to-pdf..."
              className="w-full rounded-lg border border-zinc-300 px-4 py-3"
            />
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept=".pdf,.zip,.mp4"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const url = await uploadFile(file, "product");
                    setForm((prev) => ({ ...prev, fileUrl: url }));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "File upload failed");
                  }
                }}
                className="w-full cursor-pointer rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-amber-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-amber-700 hover:file:bg-amber-200"
              />
              {form.fileUrl && !form.fileUrl.startsWith("http") && !form.fileUrl.startsWith("data:") && (
                <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  File uploaded successfully
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Audio Narration File (Optional)</label>
          <div className="flex gap-4 mb-2">
            <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
              <input type="radio" checked={audioMode === 'url'} onChange={() => setAudioMode('url')} className="text-amber-500 focus:ring-amber-500" /> Enter External URL
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
              <input type="radio" checked={audioMode === 'upload'} onChange={() => setAudioMode('upload')} className="text-amber-500 focus:ring-amber-500" /> Upload Audio File
            </label>
          </div>
          {audioMode === "url" ? (
            <input
              type="url"
              value={form.audioUrl}
              onChange={(e) => setForm({ ...form, audioUrl: e.target.value })}
              placeholder="https://link-to-audio.mp3..."
              className="w-full rounded-lg border border-zinc-300 px-4 py-3"
            />
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="audio/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const url = await uploadFile(file, "audio");
                    setForm((prev) => ({ ...prev, audioUrl: url }));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Audio upload failed");
                  }
                }}
                className="w-full cursor-pointer rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-amber-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-amber-700 hover:file:bg-amber-200"
              />
              {form.audioUrl && !form.audioUrl.startsWith("http") && !form.audioUrl.startsWith("data:") && (
                <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  Audio uploaded successfully
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="published"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
            className="rounded text-amber-500"
          />
          <label htmlFor="published" className="text-sm font-medium text-zinc-700">
            Published (visible in marketplace)
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-amber-500 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
