"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function NewChannelPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("0");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (loading) return null;
  if (!user) {
    router.push("/login");
    return null;
  }

  if (!["admin", "seller", "buyer", "user"].includes(user.role)) {
    router.push("/products");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          coverImageUrl,
          avatarUrl,
          category: category || null,
          price,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create channel");
        return;
      }
      router.push(`/channel/${data.id}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/dashboard" className="text-sm text-amber-600 hover:text-amber-700">
        ← Back
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-zinc-900">Create Channel</h1>
      <p className="mt-2 text-sm text-zinc-600">Create a community where followers can engage.</p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-zinc-700">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
          >
            <option value="">Select a category (optional)</option>
            <option value="Technology">Technology</option>
            <option value="Business">Business</option>
            <option value="Education">Education</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Sports">Sports</option>
            <option value="Health">Health</option>
            <option value="Science">Science</option>
            <option value="Art">Art</option>
            <option value="Music">Music</option>
            <option value="Gaming">Gaming</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Entry Price (USD)</label>
          <p className="text-xs text-zinc-500 mb-2">Leave as 0 to make the community free.</p>
          <div className="relative">
            <span className="absolute left-4 top-3 text-zinc-500">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 py-3 pl-8 pr-4 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Cover Image URL</label>
          <input
            type="url"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://..."
            className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700">Avatar URL</label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-amber-500 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Channel"}
        </button>
      </form>
    </div>
  );
}

