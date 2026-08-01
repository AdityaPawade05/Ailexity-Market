"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";

interface DashboardData {
  stats: {
    totalMembers: number;
    activeSubscriptions: number;
    cancelledCount: number;
    churnRate: number;
  };
  tiers: Array<{
    id: string;
    name: string;
    price: number;
    interval: string;
    memberCount: number;
    monthlyRevenue: number;
  }>;
  recentMembers: Array<{
    member: {
      id: string;
      name: string;
      username: string;
      avatar: string;
    };
  }>;
}

interface SubscriptionTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: string;
  features: string[];
  memberLimit?: number | null;
  discordRoleId?: string | null;
}

type TierForm = {
  name: string;
  description: string;
  price: number;
  interval: string;
  features: string;
  memberLimit: number | null;
  discordRoleId: string;
};

function tierToForm(tier: SubscriptionTier): TierForm {
  return {
    name: tier.name,
    description: tier.description || "",
    price: tier.price / 100,
    interval: tier.interval,
    features: (tier.features || []).join("\n"),
    memberLimit: tier.memberLimit ?? null,
    discordRoleId: tier.discordRoleId || "",
  };
}

interface MemberRow {
  id: string;
  joinedAt: string;
  member: { id: string; name: string; username: string | null; avatar: string | null; email: string };
  subscription?: { id: string; status: string; tier: { id: string; name: string; price: number } };
}

const MEMBERS_PAGE_SIZE = 20;

export default function ManageCommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const communityId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [newTierForm, setNewTierForm] = useState({
    name: "",
    description: "",
    price: 0,
    interval: "month",
    features: "",
    memberLimit: null as number | null,
    discordRoleId: "",
  });
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TierForm | null>(null);
  const [savingTier, setSavingTier] = useState(false);

  const [membersData, setMembersData] = useState<{ members: MemberRow[]; pagination: { page: number; limit: number; total: number; pages: number } } | null>(null);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberSearchInput, setMemberSearchInput] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const [kickingId, setKickingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user, communityId, router]);

  // Debounce: only re-query the server 300ms after typing stops.
  useEffect(() => {
    const timer = setTimeout(() => {
      setMemberSearchQuery(memberSearchInput.trim());
      setMemberPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearchInput]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, communityId, memberSearchQuery, memberPage]);

  async function fetchMembers() {
    setMembersLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(memberPage), limit: String(MEMBERS_PAGE_SIZE) });
      if (memberSearchQuery) qs.set("search", memberSearchQuery);
      const res = await fetch(`/api/communities/${communityId}/members?${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load members");
      const data = await res.json();
      setMembersData(data);
    } catch (err) {
      console.error("Members error:", err);
    } finally {
      setMembersLoading(false);
    }
  }

  async function handleKickMember(m: MemberRow) {
    if (!confirm(`Remove ${m.member.name} from this community? Their subscription (if any) will be cancelled too.`)) {
      return;
    }
    setKickingId(m.member.id);
    try {
      const res = await fetch(`/api/communities/${communityId}/members/${m.member.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove member");
      await Promise.all([fetchMembers(), fetchDashboard()]);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Failed to remove member"}`);
    } finally {
      setKickingId(null);
    }
  }

  async function loadData() {
    try {
      await Promise.all([fetchDashboard(), fetchTiers()]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDashboard() {
    try {
      const res = await fetch(`/api/communities/${communityId}/dashboard`, {
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to load dashboard");
      }
      const data = await res.json();
      setDashData(data);
    } catch (err) {
      console.error("Dashboard error:", err);
    }
  }

  async function fetchTiers() {
    try {
      const res = await fetch(`/api/communities/${communityId}/tiers`, {
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to load tiers");
      }
      const data = await res.json();
      const parsed: SubscriptionTier[] = data.map((t: SubscriptionTier & { features: string | null }) => {
        let features: string[] = [];
        try {
          features = t.features ? JSON.parse(t.features as unknown as string) : [];
        } catch {
          features = [];
        }
        return { ...t, features };
      });
      setTiers(parsed);
    } catch (err) {
      console.error("Tiers error:", err);
    }
  }

  async function handleDeleteCommunity() {
    if (
      !confirm(
        "Delete this community? This permanently removes its tiers, members, subscriptions, and Discord/Telegram integrations. This cannot be undone."
      )
    )
      return;

    try {
      const res = await fetch(`/api/communities/${communityId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete community");
      }
      router.push("/communities");
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Failed to delete community"}`);
    }
  }

  async function handleAddTier() {
    if (!newTierForm.name.trim()) {
      alert("Tier name is required");
      return;
    }
    if (newTierForm.price < 0) {
      alert("Price cannot be negative");
      return;
    }

    try {
      const res = await fetch(`/api/communities/${communityId}/tiers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...newTierForm,
          price: parseInt(newTierForm.price.toString()) * 100,
          features: newTierForm.features
            ? newTierForm.features.split("\n").filter((f) => f.trim())
            : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create tier");
      alert("Tier created!");
      setNewTierForm({
        name: "",
        description: "",
        price: 0,
        interval: "month",
        features: "",
        memberLimit: null,
        discordRoleId: "",
      });
      fetchTiers();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  function handleStartEdit(tier: SubscriptionTier) {
    setEditingTierId(tier.id);
    setEditForm(tierToForm(tier));
  }

  function handleCancelEdit() {
    setEditingTierId(null);
    setEditForm(null);
  }

  async function handleSaveEdit(tierId: string) {
    if (!editForm) return;
    if (!editForm.name.trim()) {
      alert("Tier name is required");
      return;
    }
    if (editForm.price < 0) {
      alert("Price cannot be negative");
      return;
    }

    setSavingTier(true);
    try {
      const res = await fetch(`/api/communities/${communityId}/tiers/${tierId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description,
          price: Math.round(editForm.price * 100),
          interval: editForm.interval,
          features: editForm.features
            ? editForm.features.split("\n").filter((f) => f.trim())
            : [],
          memberLimit: editForm.memberLimit,
          discordRoleId: editForm.discordRoleId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update tier");
      setEditingTierId(null);
      setEditForm(null);
      fetchTiers();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Failed to update tier"}`);
    } finally {
      setSavingTier(false);
    }
  }

  async function handleDeleteTier(tier: SubscriptionTier) {
    if (!confirm(`Delete the "${tier.name}" tier? This can't be undone.`)) return;

    try {
      const res = await fetch(`/api/communities/${communityId}/tiers/${tier.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete tier");
      fetchTiers();
      fetchDashboard();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Failed to delete tier"}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Community Dashboard</h1>

        {/* Stats */}
        {dashData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Total Members</p>
              <p className="text-3xl font-bold">{dashData.stats.totalMembers}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Active Subscriptions</p>
              <p className="text-3xl font-bold">
                {dashData.stats.activeSubscriptions}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Cancelled</p>
              <p className="text-3xl font-bold">{dashData.stats.cancelledCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm">Churn Rate</p>
              <p className="text-3xl font-bold">
                {(dashData.stats.churnRate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* Tiers Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-12">
          <h2 className="text-2xl font-bold mb-6">Subscription Tiers</h2>
          <div className="space-y-4">
            {tiers.length === 0 && (
              <p className="text-sm text-gray-500">No tiers yet — create one below.</p>
            )}
            {tiers.map((tier) => {
              const dashTier = dashData?.tiers.find((t) => t.id === tier.id);
              const isEditing = editingTierId === tier.id;

              if (isEditing && editForm) {
                return (
                  <div key={tier.id} className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Tier name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="border rounded px-3 py-2"
                      />
                      <input
                        type="number"
                        placeholder="Price ($)"
                        value={editForm.price || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, price: e.target.value ? parseFloat(e.target.value) : 0 })
                        }
                        className="border rounded px-3 py-2"
                      />
                      <textarea
                        placeholder="Description"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="border rounded px-3 py-2 col-span-2"
                        rows={2}
                      />
                      <textarea
                        placeholder="Features (one per line)"
                        value={editForm.features}
                        onChange={(e) => setEditForm({ ...editForm, features: e.target.value })}
                        className="border rounded px-3 py-2 col-span-2"
                        rows={2}
                      />
                      <input
                        type="text"
                        placeholder="Discord Role ID (optional)"
                        value={editForm.discordRoleId}
                        onChange={(e) => setEditForm({ ...editForm, discordRoleId: e.target.value })}
                        className="border rounded px-3 py-2 col-span-2"
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(tier.id)}
                        disabled={savingTier}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-medium disabled:opacity-50"
                      >
                        {savingTier ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={tier.id}
                  className="border rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-semibold">{tier.name}</h3>
                    <p className="text-sm text-gray-600">
                      ${(tier.price / 100).toFixed(2)}/{tier.interval}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-bold">{dashTier?.memberCount ?? 0} members</p>
                      <p className="text-sm text-green-600">
                        ${((dashTier?.monthlyRevenue ?? 0) / 100).toFixed(2)} earned
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(tier)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTier(tier)}
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create New Tier */}
        <div className="bg-white rounded-lg shadow p-6 mb-12">
          <h2 className="text-2xl font-bold mb-6">Create New Tier</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Tier name (e.g., Premium)"
              value={newTierForm.name}
              onChange={(e) =>
                setNewTierForm({ ...newTierForm, name: e.target.value })
              }
              className="border rounded px-4 py-2"
            />
            <input
              type="number"
              placeholder="Price ($)"
              value={newTierForm.price || ""}
              onChange={(e) =>
                setNewTierForm({
                  ...newTierForm,
                  price: e.target.value ? parseFloat(e.target.value) : 0,
                })
              }
              className="border rounded px-4 py-2"
            />
            <textarea
              placeholder="Description"
              value={newTierForm.description}
              onChange={(e) =>
                setNewTierForm({ ...newTierForm, description: e.target.value })
              }
              className="border rounded px-4 py-2 col-span-2"
              rows={3}
            />
            <textarea
              placeholder="Features (one per line)"
              value={newTierForm.features}
              onChange={(e) =>
                setNewTierForm({ ...newTierForm, features: e.target.value })
              }
              className="border rounded px-4 py-2 col-span-2"
              rows={3}
            />
            <div className="col-span-2">
              <input
                type="text"
                placeholder="Discord Role ID (optional)"
                value={newTierForm.discordRoleId}
                onChange={(e) =>
                  setNewTierForm({ ...newTierForm, discordRoleId: e.target.value })
                }
                className="border rounded px-4 py-2 w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                Subscribers of this tier get this Discord role. Leave blank to use the
                community&apos;s default role. Right-click the role in Discord → Copy Role ID.
              </p>
            </div>
            <button
              onClick={handleAddTier}
              className="col-span-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-medium"
            >
              Create Tier
            </button>
          </div>
        </div>

        {/* Members */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-2xl font-bold">
              Members {membersData && <span className="text-gray-400 font-normal text-lg">({membersData.pagination.total})</span>}
            </h2>
            <input
              type="search"
              value={memberSearchInput}
              onChange={(e) => setMemberSearchInput(e.target.value)}
              placeholder="Search by name, username, or email..."
              className="border rounded px-3 py-2 text-sm w-full sm:w-72"
            />
          </div>

          {membersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : !membersData || membersData.members.length === 0 ? (
            <p className="text-sm text-gray-500">
              {memberSearchQuery ? `No members match "${memberSearchQuery}".` : "No members yet."}
            </p>
          ) : (
            <>
              <div className="space-y-4">
                {membersData.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 pb-4 border-b">
                    <div
                      className="w-10 h-10 rounded-full bg-gray-300 shrink-0"
                      style={{
                        backgroundImage: m.member.avatar ? `url(${m.member.avatar})` : undefined,
                        backgroundSize: "cover",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{m.member.name}</p>
                      <p className="text-sm text-gray-600 truncate">
                        {m.member.username ? `@${m.member.username}` : m.member.email}
                      </p>
                    </div>
                    {m.subscription && (
                      <span className="rounded-full bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 shrink-0">
                        {m.subscription.tier.name}
                      </span>
                    )}
                    <button
                      onClick={() => handleKickMember(m)}
                      disabled={kickingId === m.member.id}
                      className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50 shrink-0"
                    >
                      {kickingId === m.member.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                ))}
              </div>

              {membersData.pagination.pages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                  <span>
                    Page {membersData.pagination.page} of {membersData.pagination.pages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMemberPage((p) => Math.max(1, p - 1))}
                      disabled={memberPage === 1}
                      className="rounded border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setMemberPage((p) => Math.min(membersData.pagination.pages, p + 1))}
                      disabled={memberPage === membersData.pagination.pages}
                      className="rounded border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow p-6 mt-12 border border-red-200">
          <h2 className="text-2xl font-bold mb-2 text-red-700">Danger Zone</h2>
          <p className="text-sm text-gray-600 mb-4">
            Deleting this community removes it permanently, along with its subscription
            tiers, members, subscriptions, and any Discord or Telegram integration. This
            cannot be undone.
          </p>
          <button
            onClick={handleDeleteCommunity}
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 font-medium"
          >
            Delete Community
          </button>
        </div>
      </div>
    </div>
  );
}
