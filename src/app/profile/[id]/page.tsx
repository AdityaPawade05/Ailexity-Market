"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { VerifiedBadge } from "@/components/profile/VerifiedBadge";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { FollowListModal } from "@/components/profile/FollowListModal";

type Profile = {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  coverImageUrl: string | null;
  bio: string | null;
  location: string | null;
  username: string | null;
  createdAt: string;
};

type ProfileStatsData = {
  earned: number;
  totalSales: number;
  followersCount: number;
  followingCount: number;
  channelsCount: number;
  postsCount: number;
  joinedAt: string;
};

type Viewer = { following: boolean };

type ProductItem = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  imageUrl: string | null;
  published: boolean;
  purchasesCount: number;
  createdAt: string;
  seller: { id: string; name: string };
};

type ChannelItem = {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  avatarUrl: string | null;
  createdAt: string;
  owner: { id: string; name: string; avatar: string | null };
  followersCount: number;
  following: boolean;
  postsCount: number | null;
};

function toHandle(name: string) {
  return name.replace(/\s/g, "").toLowerCase();
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();

  const profileId = String(params.id || "");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStatsData | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [tab, setTab] = useState<"products" | "communities" | "about">("products");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [ownedChannels, setOwnedChannels] = useState<ChannelItem[]>([]);
  const [joinedChannels, setJoinedChannels] = useState<ChannelItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [followProcessing, setFollowProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handle = useMemo(() => {
    if (!profile) return "";
    return profile.username || toHandle(profile.name);
  }, [profile]);

  const isVerified = profile?.role === "seller" || profile?.role === "admin";
  const canCreateChannel = !!user && (user.role === "seller" || user.role === "admin") && user.id === profileId;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (!profileId) return;

    setDataLoading(true);
    fetch(`/api/profiles/${profileId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load profile");
        return r.json();
      })
      .then((data) => {
        if (data.error) {
          router.push("/");
          return;
        }
        setProfile(data.profile);
        setStats(data.stats);
        setViewer(data.viewer);
        setProducts(Array.isArray(data.products) ? data.products : []);
        setOwnedChannels(Array.isArray(data.ownedChannels) ? data.ownedChannels : []);
        setJoinedChannels(Array.isArray(data.joinedChannels) ? data.joinedChannels : []);
      })
      .catch(() => router.push("/"))
      .finally(() => setDataLoading(false));
  }, [loading, user, profileId, router]);

  async function toggleProfileFollow() {
    if (!user || user.id === profileId || followProcessing) return;
    setFollowProcessing(true);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profileId }),
      });
      if (res.ok) {
        const data = await res.json();
        setViewer((prev) => ({ following: data.following ?? !prev?.following }));
        // Update follower count optimistically
        setStats((prev) =>
          prev
            ? {
                ...prev,
                followersCount: data.following
                  ? prev.followersCount + 1
                  : Math.max(0, prev.followersCount - 1),
              }
            : prev
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowProcessing(false);
    }
  }

  async function toggleChannelFollow(channelId: string) {
    const res = await fetch("/api/channel-follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    });
    if (res.ok) {
      const data = await res.json();
      setOwnedChannels((prev) =>
        prev.map((c) => (c.id === channelId ? { ...c, following: data.following } : c))
      );
      setJoinedChannels((prev) =>
        prev.map((c) => (c.id === channelId ? { ...c, following: data.following } : c))
      );
    }
  }

  function handleShareProfile() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading || !user) return null;

  // Skeleton while data loads
  if (!profile || !stats || !viewer) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="bg-white rounded-2xl border border-zinc-200 p-6">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-zinc-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-zinc-200 rounded animate-pulse" />
              <div className="flex gap-6">
                <div className="h-8 w-16 bg-zinc-100 rounded animate-pulse" />
                <div className="h-8 w-16 bg-zinc-100 rounded animate-pulse" />
                <div className="h-8 w-16 bg-zinc-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-4 w-48 bg-zinc-100 rounded animate-pulse" />
            <div className="h-3 w-32 bg-zinc-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const isSelf = user.id === profileId;
  const allChannels = [...ownedChannels, ...joinedChannels.filter((jc) => !ownedChannels.find((oc) => oc.id === jc.id))];

  const roleLabel =
    profile.role === "admin"
      ? "Admin"
      : profile.role === "seller"
        ? "Digital Creator"
        : "Member";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* ─── Instagram-style profile card ─── */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        {/* TOP ROW: Avatar + Stats */}
        <div className="px-5 pt-6 pb-4 sm:px-8">
          <div className="flex items-center gap-5 sm:gap-8">
            {/* Avatar with gradient ring */}
            <div className="relative shrink-0">
              <div
                className="rounded-full p-[3px]"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #ea580c, #dc2626, #f59e0b)",
                }}
              >
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden bg-white ring-[3px] ring-white">
                  {profile.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-3xl sm:text-4xl font-bold text-amber-800">
                      {profile.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              {/* Online indicator */}
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-500 ring-[3px] ring-white" />
            </div>

            {/* Stats */}
            <div className="flex-1 min-w-0">
              <ProfileStats
                productsCount={products.length}
                followersCount={stats.followersCount}
                followingCount={stats.followingCount}
                onProductsClick={() => setTab("products")}
                onFollowersClick={() => setFollowModal("followers")}
                onFollowingClick={() => setFollowModal("following")}
              />
            </div>
          </div>

          {/* IDENTITY BLOCK */}
          <div className="mt-4">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold text-zinc-900 leading-tight">
                {profile.name}
              </h1>
              {isVerified && <VerifiedBadge size={18} />}
            </div>

            <p className="text-sm text-zinc-500 mt-0.5">@{handle}</p>

            <span className="inline-block mt-1.5 text-[11px] font-semibold tracking-wider uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              {roleLabel}
            </span>

            {profile.bio && (
              <p className="mt-3 text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {profile.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Joined {new Date(stats.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
              {(profile.role === "seller" || profile.role === "admin") && stats.earned > 0 && (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ${stats.earned.toFixed(2)} earned
                </span>
              )}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="mt-5 flex gap-2">
            {isSelf ? (
              <>
                <Link
                  href="/profile"
                  className="flex-1 rounded-lg bg-zinc-100 py-2 text-center text-sm font-semibold text-zinc-800 hover:bg-zinc-200 active:scale-[0.98] transition-all"
                >
                  Edit Profile
                </Link>
                <button
                  onClick={handleShareProfile}
                  className="flex-1 rounded-lg bg-zinc-100 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-200 active:scale-[0.98] transition-all"
                >
                  {copied ? "✓ Copied!" : "Share Profile"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleProfileFollow}
                  disabled={followProcessing}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all active:scale-[0.98] ${
                    viewer.following
                      ? "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                      : "bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-200"
                  } ${followProcessing ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {followProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    </span>
                  ) : viewer.following ? (
                    "Following"
                  ) : (
                    "Follow"
                  )}
                </button>
                <button
                  disabled
                  className="flex-1 rounded-lg bg-zinc-100 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-200 active:scale-[0.98] transition-all disabled:opacity-70"
                  title="Messaging coming soon"
                >
                  Message
                </button>
                <button
                  onClick={handleShareProfile}
                  className="rounded-lg bg-zinc-100 p-2 text-zinc-600 hover:bg-zinc-200 active:scale-[0.98] transition-all shrink-0"
                  title={copied ? "Copied!" : "Share profile"}
                >
                  {copied ? (
                    <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  )}
                </button>
              </>
            )}
            {canCreateChannel && (
              <Link
                href="/channel/new"
                className="rounded-lg bg-amber-500 p-2 text-white hover:bg-amber-600 active:scale-[0.98] transition-all shrink-0"
                title="Create Channel"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Link>
            )}
          </div>
        </div>

        {/* ─── TABS ─── */}
        <div className="border-t border-zinc-200 mt-1">
          <div className="flex">
            {([
              ["products", "📦", "Products"],
              ["communities", "👥", "Communities"],
              ["about", "ℹ️", "About"],
            ] as const).map(([key, icon, label]) => (
              <button
                key={key}
                onClick={() => setTab(key as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold tracking-wide uppercase transition-all border-b-2 ${
                  tab === key
                    ? "border-amber-500 text-amber-700 bg-amber-50/30"
                    : "border-transparent text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <span className="text-sm">{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── TAB CONTENT ─── */}
        <div className="min-h-[300px]">
          {dataLoading ? (
            <div className="p-6 grid grid-cols-3 gap-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square bg-zinc-100 animate-pulse" />
              ))}
            </div>
          ) : tab === "products" ? (
            products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">No Products Yet</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  This user hasn&apos;t published any products.
                </p>
              </div>
            ) : (
              /* 3-column IG grid */
              <div className="grid grid-cols-3 gap-[2px]">
                {products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="group relative aspect-square bg-zinc-100 overflow-hidden"
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 text-4xl">
                        {p.type === "ebook" ? "📚" : "🎓"}
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <p className="text-white text-sm font-bold text-center px-2 line-clamp-2">{p.title}</p>
                      <p className="text-white/80 text-xs mt-1">${p.price.toFixed(2)}</p>
                      <div className="flex items-center gap-3 mt-2 text-white/70 text-xs">
                        <span className="flex items-center gap-1">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" />
                          </svg>
                          {p.purchasesCount}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : tab === "communities" ? (
            <div className="min-h-[300px]">
              {allChannels.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                    <svg className="h-8 w-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900">No Communities</h3>
                  <p className="mt-1 text-sm text-zinc-500">No community activity yet.</p>
                </div>
              ) : (
                <div className="p-4 space-y-1">
                  {/* Owned channels section */}
                  {ownedChannels.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 px-3 pt-2 pb-1">
                        Created
                      </p>
                      {ownedChannels.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors group"
                        >
                          <Link href={`/channel/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="h-12 w-12 rounded-xl overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100 shrink-0">
                              {c.coverImageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={c.coverImageUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-lg">👥</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-zinc-900 group-hover:text-amber-600 transition-colors truncate">
                                {c.name}
                              </p>
                              <p className="text-[11px] text-zinc-500 truncate">{c.followersCount} followers</p>
                            </div>
                          </Link>
                          {!isSelf && (
                            <button
                              onClick={() => toggleChannelFollow(c.id)}
                              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.97] ${
                                c.following
                                  ? "bg-zinc-100 text-zinc-700 hover:bg-red-50 hover:text-red-600"
                                  : "bg-amber-500 text-white hover:bg-amber-600"
                              }`}
                            >
                              {c.following ? "Following" : "Follow"}
                            </button>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {/* Joined channels section */}
                  {joinedChannels.filter((jc) => !ownedChannels.find((oc) => oc.id === jc.id)).length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 px-3 pt-4 pb-1">
                        Joined
                      </p>
                      {joinedChannels
                        .filter((jc) => !ownedChannels.find((oc) => oc.id === jc.id))
                        .map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors group"
                          >
                            <Link href={`/channel/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="h-12 w-12 rounded-xl overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100 shrink-0">
                                {c.coverImageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={c.coverImageUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-lg">👥</div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-zinc-900 group-hover:text-amber-600 transition-colors truncate">
                                  {c.name}
                                </p>
                                <p className="text-[11px] text-zinc-500 truncate">{c.followersCount} followers</p>
                              </div>
                            </Link>
                            {!isSelf && (
                              <button
                                onClick={() => toggleChannelFollow(c.id)}
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.97] ${
                                  c.following
                                    ? "bg-zinc-100 text-zinc-700 hover:bg-red-50 hover:text-red-600"
                                    : "bg-amber-500 text-white hover:bg-amber-600"
                                }`}
                              >
                                {c.following ? "Following" : "Follow"}
                              </button>
                            )}
                          </div>
                        ))}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* About tab */
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">Bio</h3>
                <p className="text-sm text-zinc-600 whitespace-pre-line leading-relaxed">
                  {profile.bio || "No bio available."}
                </p>
              </div>
              <div className="h-px bg-zinc-100" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Location</p>
                  <p className="text-zinc-900">{profile.location || "—"}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Account Type</p>
                  <p className="text-zinc-900 capitalize">{profile.role}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Member Since</p>
                  <p className="text-zinc-900">
                    {new Date(stats.joinedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {(profile.role === "seller" || profile.role === "admin") && (
                  <div>
                    <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Total Sales</p>
                    <p className="text-zinc-900">{stats.totalSales}</p>
                  </div>
                )}
              </div>
              {stats.channelsCount > 0 && (
                <>
                  <div className="h-px bg-zinc-100" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Communities</p>
                      <p className="text-zinc-900">{stats.channelsCount}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Posts</p>
                      <p className="text-zinc-900">{stats.postsCount}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Follow Modal ─── */}
      {followModal && (
        <FollowListModal
          isOpen={!!followModal}
          onClose={() => setFollowModal(null)}
          profileId={profileId}
          type={followModal}
          onFollowToggle={(userId, isFollowing) => {
            // Update stats if someone follows/unfollows from the modal
          }}
        />
      )}
    </div>
  );
}
