"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  avatarUrl: string | null;
  category: string | null;
  price: number;
  owner: { id: string };
}

export default function EditChannelPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();

  const channelId = String(params.id || "");
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loadingChannel, setLoadingChannel] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("0");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (!channelId) return;

    // Fetch channel details
    fetch(`/api/channels/${channelId}`)
      .then((res) => res.json())
      .then((data) => {
        const ch = data.channel || data;
        if (!ch || !ch.id) {
          throw new Error("Invalid channel data");
        }
        setChannel(ch);
        setName(ch.name || "");
        setDescription(ch.description || "");
        setCoverImageUrl(ch.coverImageUrl || "");
        setAvatarUrl(ch.avatarUrl || "");
        setCategory(ch.category || "");
        setPrice(ch.price?.toString() || "0");
        setLoadingChannel(false);

        // Check if user is owner
        if (ch.owner?.id !== user?.id) {
          setError("You don't have permission to edit this community");
          setTimeout(() => router.push(`/channel/${channelId}`), 2000);
        }
      })
      .catch((err) => {
        console.error("Fetch channel error:", err);
        setError("Failed to load community data");
        setLoadingChannel(false);
      });
  }, [loading, user, channelId, router]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Avatar image must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Cover image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImageUrl(reader.result as string);
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const payload: Record<string, any> = {};

      // Only include fields that were actually modified
      if (name.trim() !== channel?.name) {
        payload.name = name.trim();
      }
      if (description.trim() !== (channel?.description || "")) {
        payload.description = description.trim() || null;
      }
      if (category !== (channel?.category || "")) {
        payload.category = category || null;
      }
      if (avatarUrl !== (channel?.avatarUrl || "")) {
        payload.avatarUrl = avatarUrl || null;
      }
      if (coverImageUrl !== (channel?.coverImageUrl || "")) {
        payload.coverImageUrl = coverImageUrl || null;
      }
      const numPrice = parseFloat(price) || 0;
      if (numPrice !== (channel?.price || 0)) {
        payload.price = numPrice;
      }

      // If nothing changed, show message and return
      if (Object.keys(payload).length === 0) {
        setError("No changes made to save");
        setSubmitting(false);
        return;
      }

      const res = await fetch(`/api/channels/${channelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("API response status:", res.status, res.statusText);
        let errorMessage = "Failed to update community";
        try {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            console.error("API error response:", data);
            errorMessage = data.error || errorMessage;
          } else {
            const text = await res.text();
            console.error("API response text:", text);
            errorMessage = text || errorMessage;
          }
        } catch (parseErr) {
          console.error("Failed to parse error response:", parseErr);
        }
        setError(errorMessage);
        setSubmitting(false);
        return;
      }

      const data = await res.json();
      console.log("Update successful:", data);
      setSuccess("Community updated successfully!");
      setChannel(data);
      setTimeout(() => {
        router.push(`/channel/${channelId}`);
      }, 1500);
    } catch (err) {
      console.error("Update error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || loadingChannel) return null;

  if (!channel) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <p className="text-zinc-600">Loading community...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link href={`/channel/${channelId}`} className="text-sm text-amber-600 hover:text-amber-700">
        ← Back to Community
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-zinc-900">Edit Community</h1>
      <p className="mt-2 text-sm text-zinc-600">Update your community settings and branding.</p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

        <div>
          <label className="block text-sm font-medium text-zinc-700">Community Name</label>
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

        <div className="rounded-xl border-2 border-dashed border-zinc-300 p-6">
          <h3 className="text-sm font-semibold text-zinc-900">Profile Picture (Avatar)</h3>
          <p className="mt-1 text-xs text-zinc-500">Upload a square image (JPG, PNG)</p>
          {avatarUrl && (
            <div className="mt-3 flex items-center gap-4">
              <img
                src={avatarUrl}
                alt="Preview"
                className="h-20 w-20 rounded-full object-cover"
              />
              <div>
                <p className="text-xs text-zinc-600">Current avatar preview</p>
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  className="mt-1 text-xs text-rose-600 hover:text-rose-700"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="mt-3 w-full text-sm text-zinc-600"
          />
        </div>

        <div className="rounded-xl border-2 border-dashed border-zinc-300 p-6">
          <h3 className="text-sm font-semibold text-zinc-900">Cover Photo</h3>
          <p className="mt-1 text-xs text-zinc-500">Upload a wide image (16:9 aspect ratio recommended)</p>
          {coverImageUrl && (
            <div className="mt-3">
              <img
                src={coverImageUrl}
                alt="Preview"
                className="h-32 w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => setCoverImageUrl("")}
                className="mt-2 text-xs text-rose-600 hover:text-rose-700"
              >
                Remove
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="mt-3 w-full text-sm text-zinc-600"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-amber-500 py-3 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
          <Link
            href={`/channel/${channelId}`}
            className="flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
