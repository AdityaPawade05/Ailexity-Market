"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VerifiedBadge } from "@/components/profile/VerifiedBadge";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { FollowListModal } from "@/components/profile/FollowListModal";

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
};

type ChannelItem = {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  avatarUrl: string | null;
  followersCount: number;
  postsCount: number | null;
};

export default function ProfilePage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [tab, setTab] = useState<"products" | "communities" | "about">("products");
  const [copied, setCopied] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const handle = useMemo(() => {
    if (!profile) return "";
    return profile.username || profile.name?.replace(/\s/g, "").toLowerCase() || "";
  }, [profile]);

  const isVerified = profile?.role === "seller" || profile?.role === "admin";

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      setDataLoading(true);
      Promise.all([
        fetch("/api/profile").then((r) => r.ok ? r.json() : {}),
        fetch("/api/my-products").then((r) => r.ok ? r.json() : []),
        fetch(`/api/channels?ownerId=${user.id}`).then((r) => r.ok ? r.json() : []),
      ])
        .then(([profileData, productsData, channelsData]) => {
          const profilePayload = profileData as { user?: typeof profile };
          if (profilePayload.user) setProfile(profilePayload.user);
          if (Array.isArray(productsData)) setProducts(productsData);
          if (Array.isArray(channelsData)) setChannels(channelsData);
        })
        .catch(console.error)
        .finally(() => setDataLoading(false));
    }
  }, [user, loading, router]);

  function handleProfileSaved(updated: any) {
    setProfile((prev: any) => ({ ...prev, ...updated }));
    refresh();
  }

  function handleShareProfile() {
    const url = `${window.location.origin}/profile/${profile?.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Skeleton loader */}
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
        </div>
      </div>
    );
  }

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
                    <img
                      src={profile.avatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-3xl sm:text-4xl font-bold text-amber-800">
                      {profile.name?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
              </div>
              {/* Online dot */}
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-500 ring-[3px] ring-white" />
            </div>

            {/* Stats */}
            <div className="flex-1 min-w-0">
              <ProfileStats
                productsCount={products.length}
                followersCount={profile.followersCount ?? 0}
                followingCount={profile.followingCount ?? 0}
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
              {profile.socialLinks && (
                <a
                  href={profile.socialLinks.startsWith("http") ? profile.socialLinks : `https://${profile.socialLinks}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {profile.socialLinks.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="flex-1 rounded-lg bg-zinc-100 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-200 active:scale-[0.98] transition-all"
            >
              Edit Profile
            </button>
            <button
              onClick={handleShareProfile}
              className="flex-1 rounded-lg bg-zinc-100 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-200 active:scale-[0.98] transition-all"
            >
              {copied ? "✓ Copied!" : "Share Profile"}
            </button>
            <button
              disabled
              className="rounded-lg bg-zinc-100 p-2 text-zinc-500"
              title="More options"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01" />
              </svg>
            </button>
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
                <p className="mt-1 text-sm text-zinc-500 max-w-xs">
                  Start selling digital products — they&apos;ll appear in your profile grid.
                </p>
                {(profile.role === "seller" || profile.role === "admin") && (
                  <Link
                    href="/dashboard"
                    className="mt-4 rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
                  >
                    Create Product
                  </Link>
                )}
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
            channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900">No Communities</h3>
                <p className="mt-1 text-sm text-zinc-500">Communities you create will appear here.</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {channels.map((c) => (
                  <Link
                    key={c.id}
                    href={`/channel/${c.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors group"
                  >
                    <div className="h-14 w-14 rounded-xl overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100 shrink-0">
                      {c.coverImageUrl ? (
                        <img src={c.coverImageUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl">👥</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 group-hover:text-amber-600 transition-colors truncate">
                        {c.name}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">
                        {c.description || "No description"}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        {c.followersCount} followers
                      </p>
                    </div>
                    <svg className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )
          ) : (
            /* About tab */
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">Bio</h3>
                <p className="text-sm text-zinc-600 whitespace-pre-line leading-relaxed">
                  {profile.bio || "No bio added yet."}
                </p>
              </div>
              <div className="h-px bg-zinc-100" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Email</p>
                  <p className="text-zinc-900">{profile.email}</p>
                </div>
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
                    {new Date(profile.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              {profile.socialLinks && (
                <>
                  <div className="h-px bg-zinc-100" />
                  <div>
                    <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Website</p>
                    <a
                      href={profile.socialLinks.startsWith("http") ? profile.socialLinks : `https://${profile.socialLinks}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                    >
                      {profile.socialLinks.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── MODALS ─── */}
      {editOpen && (
        <EditProfileModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          profile={profile}
          onSaved={handleProfileSaved}
        />
      )}

      {followModal && profile?.id && (
        <FollowListModal
          isOpen={!!followModal}
          onClose={() => setFollowModal(null)}
          profileId={profile.id}
          type={followModal}
        />
      )}
    </div>
  );
}
