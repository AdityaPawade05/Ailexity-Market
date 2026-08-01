"use client";

import { useState, useEffect, useCallback, Suspense, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type BusinessProfile = {
  id?: string;
  name?: string | null;
  bio?: string | null;
  avatar?: string | null;
  coverImageUrl?: string | null;
  socialLinks?: string | null;
  location?: string | null;
};

type TeamPerson = { id: string; name: string; email: string; avatar: string | null };
type TeamMemberRow = { id: string; role: string; createdAt: string; user: TeamPerson };
type TeamInviteRow = { id: string; email: string | null; token: string; status: string; createdAt: string };
type TeamData = { owner: TeamPerson | null; members: TeamMemberRow[]; invites: TeamInviteRow[] };

type ActivityItem = {
  id: string;
  amount: number;
  createdAt: string;
  product?: { title: string } | null;
  channel?: { name: string } | null;
  buyer: { name: string };
};

function BusinessHomeContent() {
  const { user, refresh } = useAuth();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const isSpecificBusiness = Boolean(type && id);

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // State
  const [activeTab, setActiveTab] = useState("Home");
  const [isEditProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [isSocialModalOpen, setSocialModalOpen] = useState(false);
  const [isLocationModalOpen, setLocationModalOpen] = useState(false);
  const [isTeamModalOpen, setTeamModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Form states
  const [editFormData, setEditFormData] = useState({ name: "", bio: "", avatar: "", coverImageUrl: "" });
  const [socialLinksStr, setSocialLinksStr] = useState("");
  const [locationStr, setLocationStr] = useState("");

  const [saving, setSaving] = useState(false);

  const [team, setTeam] = useState<TeamData | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitingTeam, setInvitingTeam] = useState(false);
  const [teamError, setTeamError] = useState("");

  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const url = isSpecificBusiness ? `/api/business?type=${type}&id=${id}` : "/api/profile";
      const res = await fetch(url);
      const text = await res.text();
      let data;
      try {
        if (!text) throw new Error("Empty response");
        data = JSON.parse(text);
      } catch {
        console.warn("Server returned non-JSON response for profile. Falling back to session data.");
        setProfile(user);
        return;
      }

      if (res.ok && data) {
        const entity = data.business || data.user;
        if (entity) {
          setProfile(entity);
          setEditFormData({
            name: entity.name || "",
            bio: entity.bio || "",
            avatar: entity.avatar || "",
            coverImageUrl: entity.coverImageUrl || ""
          });
          setSocialLinksStr(entity.socialLinks || "");
          setLocationStr(entity.location || "");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, isSpecificBusiness, type, id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const loadTeam = useCallback(async () => {
    if (!user || !isSpecificBusiness) return;
    const res = await fetch(`/api/business/team?type=${type}&id=${id}`);
    const data = await res.json();
    if (res.ok) setTeam(data);
  }, [user, isSpecificBusiness, type, id]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const loadActivity = useCallback(async () => {
    if (!user) return;
    const params = new URLSearchParams({ as: "seller" });
    if (type === "product" && id) params.set("productId", id);
    if (type === "community" && id) params.set("channelId", id);
    const res = await fetch(`/api/purchases?${params.toString()}`);
    const data = await res.json();
    if (res.ok && Array.isArray(data)) setActivity(data.slice(0, 10));
  }, [user, type, id]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const saveProfile = async (payload: Record<string, string | null>) => {
    setSaving(true);
    try {
      const url = isSpecificBusiness ? `/api/business?type=${type}&id=${id}` : "/api/profile";
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let parseFailed = false;
      try {
        if (!text) throw new Error("Empty response");
        JSON.parse(text);
      } catch {
        console.warn("saveProfile received non-JSON response. Proceeding with refresh anyway.");
        parseFailed = true;
      }

      if (res.ok || parseFailed) {
        await fetchProfile();
        await refresh();
        closeModals();
      }
    } catch(e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const closeModals = () => {
    setEditProfileModalOpen(false);
    setSocialModalOpen(false);
    setLocationModalOpen(false);
    setTeamModalOpen(false);
  };

  const copyProfileLink = () => {
    const link = isSpecificBusiness
      ? window.location.origin + `/business/home?type=${type}&id=${id}`
      : window.location.origin + "/business/home";
    navigator.clipboard.writeText(link);
    alert("Dashboard link copied to clipboard!");
  };

  async function handleInviteSubmit(e: FormEvent) {
    e.preventDefault();
    await createInvite(inviteEmail || undefined);
    setInviteEmail("");
  }

  async function createInvite(email?: string) {
    setTeamError("");
    setInvitingTeam(true);
    try {
      const res = await fetch("/api/business/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTeamError(data.error || "Failed to create invite");
        return;
      }
      await loadTeam();
      return data.inviteUrl as string;
    } finally {
      setInvitingTeam(false);
    }
  }

  async function quickCopyInviteLink() {
    const url = await createInvite(undefined);
    if (url) {
      navigator.clipboard.writeText(url);
      alert("Invite link copied!");
    }
  }

  async function revokeInvite(inviteId: string) {
    await fetch(`/api/business/team/invite/${inviteId}`, { method: "DELETE" });
    loadTeam();
  }

  async function removeMember(memberId: string) {
    await fetch(`/api/business/team/member/${memberId}`, { method: "DELETE" });
    loadTeam();
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
    </div>
  );

  const userData: BusinessProfile = profile ?? user ?? {};
  if (!userData) return null;

  const userName = userData.name || "Your Business";
  const userBio = userData.bio || "Welcome to your business dashboard. Share your products, courses, and communities with the world.";
  const avatarUrl = userData.avatar;
  const coverUrl = userData.coverImageUrl;
  const initial = userName.charAt(0).toUpperCase();
  const userLocation = userData.location;
  const hasSocials = !!userData.socialLinks;
  const teamCount = 1 + (team?.members.length ?? 0);

  return (
    <div className="flex h-full min-h-screen font-sans">
      {/* Main Content */}
      <div className="flex-1 bg-white/80 backdrop-blur-sm p-6 md:p-8 relative">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-zinc-900">{activeTab}</h1>
          <div className="flex items-center gap-4 relative">
            <button className="text-zinc-500 hover:text-amber-600 transition" onClick={() => copyProfileLink()}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
            <button onClick={() => setShowNotifications(!showNotifications)} className="text-zinc-500 hover:text-amber-600 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-8 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl z-50">
                <h3 className="font-bold text-sm text-zinc-900 mb-3">Recent sales</h3>
                {activity.length === 0 ? (
                  <p className="text-sm text-zinc-500">No sales yet.</p>
                ) : (
                  <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">
                    {activity.slice(0, 6).map((a) => (
                      <div key={a.id} className="flex items-start gap-3">
                        <div className="h-2 w-2 mt-1.5 rounded-full bg-green-500 shrink-0" />
                        <p className="text-sm text-zinc-600">
                          <span className="font-medium text-zinc-900">{a.buyer.name}</span> purchased{" "}
                          {a.product?.title || a.channel?.name || "an item"} for ${a.amount.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-4xl">
          {/* Cover Area */}
          <div className="relative h-64 w-full rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 overflow-hidden shadow-md group">
            {coverUrl ? (
              <Image src={coverUrl} alt="Cover" fill className="object-cover opacity-90 mix-blend-overlay" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                 <span className="text-5xl opacity-50">🏢</span>
              </div>
            )}

            {/* Edit Cover button on hover */}
            <button
              onClick={() => setEditProfileModalOpen(true)}
              className="absolute top-4 right-4 z-30 opacity-0 group-hover:opacity-100 transition flex items-center gap-2 rounded-lg bg-black/50 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/70"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              Edit Cover
            </button>

            {/* Avatar Profile */}
            <div className="absolute -bottom-10 left-8 z-20 rounded-3xl border-4 border-white bg-white overflow-hidden shadow-lg h-28 w-28 flex items-center justify-center group/avatar cursor-pointer" onClick={() => setEditProfileModalOpen(true)}>
              {avatarUrl ? (
                <Image src={avatarUrl} alt={userName} fill className="object-cover" unoptimized />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">{initial}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition flex">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
            </div>
          </div>

          <div className="mt-14 px-2">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900">{userName}</h1>
                <p className="mt-3 text-sm text-zinc-600 max-w-2xl leading-relaxed">
                  {userBio}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
                  <button onClick={() => setLocationModalOpen(true)} className="flex items-center gap-1 hover:text-amber-600 transition">
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {userLocation || "Location hidden"}
                  </button>
                  <span>·</span>
                  <button onClick={() => setSocialModalOpen(true)} className={`flex items-center gap-1 font-medium transition ${hasSocials ? 'text-amber-600' : 'text-zinc-600 hover:text-amber-600'}`}>
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    {hasSocials ? "Edit social links" : "Add social links"}
                  </button>
                  <span>·</span>
                  <div className="flex items-center gap-1.5">
                    Created by
                    <div className="ml-1 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[10px] font-bold text-white">
                      {user?.avatar ? <Image src={user.avatar} alt="" width={20} height={20} className="object-cover" unoptimized /> : user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-zinc-900">{user?.name}</span>
                  </div>
                </div>
                {isSpecificBusiness && (
                  <div className="mt-4 text-sm font-medium text-zinc-900 cursor-pointer" onClick={() => setTeamModalOpen(true)}>
                    {teamCount} <span className="text-zinc-500 font-normal hover:text-amber-600">member{teamCount === 1 ? "" : "s"}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditProfileModalOpen(true)} className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-500 hover:bg-zinc-50 hover:text-amber-600 shadow-sm transition">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onClick={copyProfileLink} className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-500 hover:bg-zinc-50 hover:text-amber-600 shadow-sm transition">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
                {isSpecificBusiness && (
                  <button onClick={() => setTeamModalOpen(true)} className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 transition">
                    Add team <span className="text-lg leading-none">+</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-8 border-b border-zinc-200 flex gap-6 sm:gap-8 overflow-x-auto text-sm font-medium text-zinc-500 pb-[1px]">
              {["Home", "Apps", "About"].map(tab => (
                 <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 transition whitespace-nowrap border-b-2 ${activeTab === tab ? 'border-amber-500 text-zinc-900' : 'border-transparent hover:border-zinc-300 hover:text-zinc-900'}`}
                 >
                   {tab}
                 </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="mt-6">
              {activeTab === "Home" && (
                <div className="flex flex-col gap-3">
                  {activity.length === 0 ? (
                    <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
                      <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-3">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      </div>
                      <h3 className="text-zinc-900 font-bold">No activity yet</h3>
                      <p className="text-zinc-500 text-sm mt-1">Sales and other activity for this business will show up here.</p>
                    </div>
                  ) : (
                    activity.map((a) => (
                      <div key={a.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                        <div>
                          <p className="text-sm text-zinc-900">
                            <span className="font-semibold">{a.buyer.name}</span> purchased{" "}
                            {a.product?.title || a.channel?.name || "an item"}
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5">{new Date(a.createdAt).toLocaleString()}</p>
                        </div>
                        <span className="text-sm font-semibold text-amber-600">${a.amount.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
              {activeTab === "Apps" && (
                <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
                  <svg className="w-12 h-12 text-zinc-300 mb-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  <h3 className="text-zinc-900 font-bold">App Integrations</h3>
                  <p className="text-zinc-500 text-sm mt-1">Connect Discord, Telegram, Notion, and more.</p>
                </div>
              )}
              {activeTab === "About" && (
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <h3 className="font-bold text-zinc-900 mb-2">About {userName}</h3>
                  <p className="text-zinc-600 text-sm whitespace-pre-wrap">{userBio}</p>

                  {hasSocials && (
                    <div className="mt-6 pt-6 border-t border-zinc-100">
                      <h4 className="font-medium text-zinc-900 text-sm mb-3">Links</h4>
                      <p className="text-sm font-mono text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">{userData.socialLinks}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- Modals --- */}

        {/* 1. Edit Profile Modal */}
        {isEditProfileModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-zinc-900 mb-4">Edit Profile</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Display Name</label>
                  <input type="text" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Bio</label>
                  <textarea value={editFormData.bio} onChange={e => setEditFormData({...editFormData, bio: e.target.value})} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none h-24" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Avatar Image URL</label>
                  <input type="text" value={editFormData.avatar} onChange={e => setEditFormData({...editFormData, avatar: e.target.value})} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Cover Image URL</label>
                  <input type="text" value={editFormData.coverImageUrl} onChange={e => setEditFormData({...editFormData, coverImageUrl: e.target.value})} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={closeModals} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">Cancel</button>
                <button onClick={() => saveProfile(editFormData)} disabled={saving} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Edit Location Modal */}
        {isLocationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-zinc-900 mb-4">Set Location</h2>
              <input type="text" value={locationStr} onChange={e => setLocationStr(e.target.value)} placeholder="e.g. San Francisco, CA" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" />
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={closeModals} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">Cancel</button>
                <button onClick={() => saveProfile({ location: locationStr })} disabled={saving} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Social Links Modal */}
        {isSocialModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-zinc-900 mb-4">Social Links</h2>
              <p className="text-xs text-zinc-500 mb-4">Paste your links (e.g. twitter.com/username)</p>
              <textarea value={socialLinksStr} onChange={e => setSocialLinksStr(e.target.value)} placeholder="https://twitter.com/...&#10;https://instagram.com/..." className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none h-32" />
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={closeModals} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">Cancel</button>
                <button onClick={() => saveProfile({ socialLinks: socialLinksStr })} disabled={saving} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Team Modal */}
        {isTeamModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-zinc-900">Manage Team</h2>
                <button onClick={closeModals} className="text-zinc-400 hover:text-zinc-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between p-3 border border-amber-200 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                      {initial}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{team?.owner?.name || userName}</div>
                      <div className="text-xs text-zinc-500">Owner</div>
                    </div>
                  </div>
                </div>

                {team?.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 border border-zinc-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-200 flex items-center justify-center text-zinc-700 font-bold">
                        {m.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-zinc-900">{m.user.name}</div>
                        <div className="text-xs text-zinc-500">{m.user.email}</div>
                      </div>
                    </div>
                    <button onClick={() => removeMember(m.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </div>
                ))}

                {team?.invites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 border border-dashed border-zinc-200 rounded-lg">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-700 truncate">{inv.email || "Anyone with the link"}</div>
                      <div className="text-xs text-zinc-400">Pending invite</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`);
                          alert("Invite link copied!");
                        }}
                        className="text-xs text-amber-700 hover:underline"
                      >
                        Copy link
                      </button>
                      <button onClick={() => revokeInvite(inv.id)} className="text-xs text-red-500 hover:text-red-700">Revoke</button>
                    </div>
                  </div>
                ))}
              </div>

              {teamError && <p className="text-xs text-rose-600 mb-3">{teamError}</p>}

              <div className="border-t border-zinc-200 pt-5">
                <h3 className="text-sm font-medium text-zinc-900 mb-3">Invite new members</h3>
                <form onSubmit={handleInviteSubmit} className="flex gap-2 mb-3">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={invitingTeam || !inviteEmail}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
                <button
                  onClick={quickCopyInviteLink}
                  disabled={invitingTeam}
                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition disabled:opacity-50"
                >
                  Or generate a shareable invite link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-72 shrink-0 bg-amber-50/20 p-6 border-l border-zinc-100">
        <nav className="space-y-4 mb-8 text-sm font-medium text-zinc-700">
          <Link href="/business/marketing" className="flex items-center gap-3 hover:text-amber-600 transition">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            Ads
          </Link>
          <Link href="/business/marketing?tab=Affiliate%20links" className="flex items-center gap-3 hover:text-amber-600 transition">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            Affiliates
          </Link>
        </nav>

        {isSpecificBusiness && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-900">People <span className="text-zinc-400 font-normal">{teamCount}</span></h3>
              <button onClick={() => setTeamModalOpen(true)} className="text-sm font-medium text-amber-600 hover:text-amber-700">See all</button>
            </div>

            <div className="mb-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-amber-500">Team</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm font-bold text-white">
                      {avatarUrl ? <Image src={avatarUrl} alt="" width={40} height={40} className="object-cover" unoptimized /> : initial}
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-green-500"></div>
                  </div>
                  <div className="min-w-0">
                     <div className="text-sm font-medium text-zinc-900 truncate pr-2 max-w-[80px]">{userName}</div>
                     <div className="text-xs text-zinc-500 truncate pr-2 max-w-[80px]">@{userName?.toLowerCase().replace(/\s/g, "") || "user"}</div>
                  </div>
                </div>
                <span className="rounded bg-amber-50 border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-800">Owner</span>
              </div>
            </div>

            <button onClick={quickCopyInviteLink} disabled={invitingTeam} className="w-full rounded-lg bg-zinc-50 border border-zinc-200 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition flex items-center justify-center gap-2 disabled:opacity-50">
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              Copy invite link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BusinessHomePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    }>
      <BusinessHomeContent />
    </Suspense>
  );
}
