"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

function CreateContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [creationType, setCreationType] = useState<"channel" | "community">(
    searchParams.get("type") === "community" ? "community" : "channel"
  );

  // Channel state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("0");

  // Community state
  const [communityName, setCommunityName] = useState("");
  const [communityDescription, setCommunityDescription] = useState("");
  const [communityCategory, setCommunityCategory] = useState("Business");
  const [communityAvatarUrl, setCommunityAvatarUrl] = useState("");
  const [communityCoverImageUrl, setCommunityCoverImageUrl] = useState("");

  // Community flow: "details" -> "integration"
  const [communityStep, setCommunityStep] = useState<"details" | "integration">("details");
  const [createdCommunityId, setCreatedCommunityId] = useState("");
  const [integration, setIntegration] = useState<"none" | "discord" | "telegram">("none");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (loading) return null;
  if (!user) {
    router.push("/login");
    return null;
  }

  async function handleChannelSubmit(e: React.FormEvent) {
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

  async function handleCommunitySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: communityName,
          description: communityDescription,
          category: communityCategory,
          avatarUrl: communityAvatarUrl,
          coverImageUrl: communityCoverImageUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create community");
      }

      const community = await res.json();
      // Move to the integration-choice step instead of jumping straight to manage.
      setCreatedCommunityId(community.id);
      setCommunityStep("integration");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function finishIntegration() {
    if (integration === "none") {
      router.push(`/communities/${createdCommunityId}/manage`);
    } else {
      router.push(`/communities/${createdCommunityId}/integrations?setup=${integration}`);
    }
  }

  const showTabs = communityStep === "details";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/dashboard" className="text-sm text-amber-600 hover:text-amber-700">
        ← Back
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-zinc-900">Create New</h1>
      <p className="mt-2 text-sm text-zinc-600">Choose what you&apos;d like to create.</p>

      {/* Tabs (hidden once we're in the community integration step) */}
      {showTabs && (
        <div className="mt-8 flex gap-4 border-b border-zinc-200">
          <button
            onClick={() => setCreationType("channel")}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              creationType === "channel"
                ? "border-amber-500 text-amber-600"
                : "border-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            💬 Create Channel
          </button>
          <button
            onClick={() => setCreationType("community")}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              creationType === "community"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            ✨ Create Community
          </button>
        </div>
      )}

      {/* Channel Form */}
      {creationType === "channel" && (
        <form
          onSubmit={handleChannelSubmit}
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
            <p className="text-xs text-zinc-500 mb-2">Leave as 0 to make the channel free.</p>
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
      )}

      {/* Community Flow — Step 1: details */}
      {creationType === "community" && communityStep === "details" && (
        <form
          onSubmit={handleCommunitySubmit}
          className="mt-8 space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-zinc-700">Community Name</label>
            <input
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
              required
              placeholder="e.g., Advanced Trading Strategies"
              className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Description</label>
            <textarea
              value={communityDescription}
              onChange={(e) => setCommunityDescription(e.target.value)}
              required
              rows={4}
              placeholder="What's your community about?"
              className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Category</label>
            <select
              value={communityCategory}
              onChange={(e) => setCommunityCategory(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
            >
              <option value="Trading">Trading</option>
              <option value="Fitness">Fitness</option>
              <option value="Business">Business</option>
              <option value="AI Tools">AI Tools</option>
              <option value="Gaming">Gaming</option>
              <option value="Development">Development</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Avatar URL</label>
            <input
              type="url"
              value={communityAvatarUrl}
              onChange={(e) => setCommunityAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Cover Image URL</label>
            <input
              type="url"
              value={communityCoverImageUrl}
              onChange={(e) => setCommunityCoverImageUrl(e.target.value)}
              placeholder="https://..."
              className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-500 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Next: Setup Integration"}
          </button>
        </form>
      )}

      {/* Community Flow — Step 2: integration choice */}
      {creationType === "community" && communityStep === "integration" && (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-zinc-900">Connect Your Community</h2>
          <p className="mt-1 text-sm text-zinc-600">Choose how members join your community.</p>

          <div className="mt-6 space-y-4">
            {/* Discord */}
            <div
              onClick={() => setIntegration("discord")}
              className={`cursor-pointer rounded-xl border-2 p-5 transition ${
                integration === "discord"
                  ? "border-blue-500 bg-blue-50"
                  : "border-zinc-200 hover:border-blue-300"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl">🤖</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900">Discord Integration</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    Auto-assign roles to members for instant access to private channels.
                  </p>
                </div>
                <input
                  type="radio"
                  name="integration"
                  checked={integration === "discord"}
                  onChange={() => setIntegration("discord")}
                  className="mt-1 h-5 w-5"
                />
              </div>
            </div>

            {/* Telegram */}
            <div
              onClick={() => setIntegration("telegram")}
              className={`cursor-pointer rounded-xl border-2 p-5 transition ${
                integration === "telegram"
                  ? "border-blue-500 bg-blue-50"
                  : "border-zinc-200 hover:border-blue-300"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl">💬</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900">Telegram Integration</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    Send single-use invite links so members join your private group instantly.
                  </p>
                </div>
                <input
                  type="radio"
                  name="integration"
                  checked={integration === "telegram"}
                  onChange={() => setIntegration("telegram")}
                  className="mt-1 h-5 w-5"
                />
              </div>
            </div>

            {/* Skip */}
            <div
              onClick={() => setIntegration("none")}
              className={`cursor-pointer rounded-xl border-2 p-5 transition ${
                integration === "none"
                  ? "border-zinc-500 bg-zinc-50"
                  : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl">⏭️</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-900">Skip for Now</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    Set up integration later from your community dashboard.
                  </p>
                </div>
                <input
                  type="radio"
                  name="integration"
                  checked={integration === "none"}
                  onChange={() => setIntegration("none")}
                  className="mt-1 h-5 w-5"
                />
              </div>
            </div>
          </div>

          <button
            onClick={finishIntegration}
            className="mt-6 w-full rounded-lg bg-blue-500 py-3 font-semibold text-white hover:bg-blue-600"
          >
            {integration === "none" ? "Complete" : "Setup Integration →"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreateContent />
    </Suspense>
  );
}
