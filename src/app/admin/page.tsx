"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

type Stats = {
  usersCount: number;
  newUsersThisWeek: number;
  productsCount: number;
  publishedProductsCount: number;
  purchasesCount: number;
  totalRevenue: number;
  postsCount: number;
  channelsCount: number;
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string | null;
  username: string | null;
  banned: boolean;
  createdAt: string;
  _count: {
    products: number;
    purchases: number;
    sales: number;
    posts: number;
    comments: number;
    channels: number;
    followers: number;
    following: number;
  };
};

type Product = {
  id: string;
  title: string;
  price: number;
  type: string;
  published: boolean;
  seller: { name: string; email: string };
  _count: { purchases: number };
};

type Purchase = {
  id: string;
  amount: number;
  refunded: boolean;
  refundRequestedAt: string | null;
  refundReason: string | null;
  createdAt: string;
  product: { title: string } | null;
  channel: { name: string } | null;
  buyer: { name: string; email: string };
  seller: { name: string };
};

type ActivityEvent =
  | { type: "purchase"; id: string; createdAt: string; label: string; amount: number; user: { id: string; name: string; avatar: string | null } }
  | { type: "post"; id: string; createdAt: string; label: string; content: string; user: { id: string; name: string; avatar: string | null }; likes: number; comments: number }
  | { type: "signup"; id: string; createdAt: string; label: string; user: { id: string; name: string; avatar: string | null }; email: string };

type UserDetail = AdminUser & {
  bio: string | null;
  location: string | null;
  totalRevenue: number;
  products: { id: string; title: string; price: number; type: string; published: boolean; createdAt: string; _count: { purchases: number } }[];
  purchases: { id: string; amount: number; createdAt: string; product: { title: string } | null; seller: { name: string } }[];
  sales: { id: string; amount: number; createdAt: string; product: { title: string } | null; buyer: { name: string; email: string } }[];
  posts: { id: string; content: string; createdAt: string; _count: { likes: number; comments: number } }[];
  channels: { id: string; name: string; category: string | null; price: number; createdAt: string; _count: { channelFollows: number; posts: number } }[];
};

type Tab = "overview" | "users" | "products" | "purchases" | "activity" | "wallet";

type PlatformWallet = {
  balance: number;
  totalCommissionFromPurchases: number;
  totalGMV: number;
  totalSellerPayouts: number;
  purchasesCount: number;
  topSellers: {
    seller: { id: string; name: string; email: string } | null;
    totalEarnings: number;
    totalCommission: number;
    totalSales: number;
    salesCount: number;
  }[];
  recentPurchases: {
    id: string;
    amount: number;
    commissionAmount: number;
    sellerEarning: number;
    createdAt: string;
    product: { title: string } | null;
    channel: { name: string } | null;
    buyer: { name: string; email: string };
    seller: { name: string; email: string };
  }[];
};

function Avatar({ user, size = 8 }: { user: { name: string; avatar: string | null }; size?: number }) {
  return user.avatar ? (
    <img
      src={user.avatar}
      alt=""
      className={`h-${size} w-${size} rounded-full object-cover shrink-0`}
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className={`h-${size} w-${size} rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-bold text-white shrink-0`}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

function StatCard({ label, value, sub, color = "zinc" }: { label: string; value: string | number; sub?: string; color?: string }) {
  const valueClass = color === "amber" ? "text-amber-600" : color === "green" ? "text-green-600" : color === "blue" ? "text-blue-600" : "text-zinc-900";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

function eventTypeIcon(type: string) {
  if (type === "purchase") return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-sm font-bold">$</span>;
  if (type === "post") return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs">📝</span>;
  return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs">👋</span>;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [platformWallet, setPlatformWallet] = useState<PlatformWallet | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [banningId, setBanningId] = useState<string | null>(null);
  const [productActionId, setProductActionId] = useState<string | null>(null);

  async function handleRefund(p: Purchase) {
    const itemName = p.product?.title ?? p.channel?.name ?? "this purchase";
    const verb = p.refundRequestedAt ? "Approve the buyer's refund request:" : "Refund";
    if (!confirm(`${verb} $${p.amount.toFixed(2)} to ${p.buyer.name} for "${itemName}"? This can't be undone.`)) {
      return;
    }
    setRefundingId(p.id);
    try {
      const res = await fetch(`/api/purchases/${p.id}/refund`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to refund");
        return;
      }
      setPurchases((prev) => prev.map((row) => (row.id === p.id ? { ...row, refunded: true, refundRequestedAt: null } : row)));
    } finally {
      setRefundingId(null);
    }
  }

  async function handleReject(p: Purchase) {
    const itemName = p.product?.title ?? p.channel?.name ?? "this purchase";
    if (!confirm(`Decline ${p.buyer.name}'s refund request for "${itemName}"?`)) {
      return;
    }
    setRejectingId(p.id);
    try {
      const res = await fetch(`/api/purchases/${p.id}/refund-reject`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to decline");
        return;
      }
      setPurchases((prev) => prev.map((row) => (row.id === p.id ? { ...row, refundRequestedAt: null } : row)));
    } finally {
      setRejectingId(null);
    }
  }

  async function handleBanToggle(u: AdminUser) {
    const nextBanned = !u.banned;
    const verb = nextBanned ? "Ban" : "Unban";
    if (!confirm(`${verb} ${u.name} (${u.email})?${nextBanned ? " They'll be logged out and unable to log back in." : ""}`)) {
      return;
    }
    setBanningId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: nextBanned }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || `Failed to ${verb.toLowerCase()}`);
        return;
      }
      setUsers((prev) => prev.map((row) => (row.id === u.id ? { ...row, banned: nextBanned } : row)));
      setSelectedUser((prev) => (prev && prev.id === u.id ? { ...prev, banned: nextBanned } : prev));
    } finally {
      setBanningId(null);
    }
  }

  function exportPurchasesCsv() {
    const header = ["Purchase ID", "Item", "Buyer", "Buyer email", "Seller", "Amount ($)", "Status", "Date (ISO)"];
    const rows = purchases.map((p) => [
      p.id,
      p.product?.title ?? p.channel?.name ?? "—",
      p.buyer.name,
      p.buyer.email,
      p.seller.name,
      p.amount.toFixed(2),
      p.refunded ? "Refunded" : "Paid",
      new Date(p.createdAt).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platform-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handlePublishToggle(p: Product) {
    const nextPublished = !p.published;
    setProductActionId(p.id);
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: nextPublished }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update product");
        return;
      }
      setProducts((prev) => prev.map((row) => (row.id === p.id ? { ...row, published: nextPublished } : row)));
    } finally {
      setProductActionId(null);
    }
  }

  async function handleDeleteProduct(p: Product) {
    if (!confirm(`Permanently delete "${p.title}"? This can't be undone.`)) {
      return;
    }
    setProductActionId(p.id);
    try {
      const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete product");
        return;
      }
      setProducts((prev) => prev.filter((row) => row.id !== p.id));
    } finally {
      setProductActionId(null);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== "admin") {
        router.push("/");
        return;
      }
    }
    if (user?.role === "admin") {
      Promise.all([
        fetch("/api/admin/stats").then((r) => r.json()),
        fetch("/api/admin/users").then((r) => r.json()),
        fetch("/api/admin/products").then((r) => r.json()),
        fetch("/api/admin/purchases").then((r) => r.json()),
        fetch("/api/admin/activity").then((r) => r.json()),
        fetch("/api/admin/platform-wallet").then((r) => r.json()),
      ]).then(([s, u, p, pur, act, pw]) => {
        setStats(s);
        setUsers(Array.isArray(u) ? u : []);
        setProducts(Array.isArray(p) ? p : []);
        setPurchases(Array.isArray(pur) ? pur : []);
        setActivity(Array.isArray(act) ? act : []);
        setPlatformWallet(pw);
      }).finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const openUserDetail = useCallback(async (userId: string) => {
    setUserDetailLoading(true);
    setSelectedUser(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      setSelectedUser(data);
    } finally {
      setUserDetailLoading(false);
    }
  }, []);

  if (authLoading || !user) return null;
  if (user.role !== "admin") return null;

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.username ?? "").toLowerCase().includes(userSearch.toLowerCase())
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "users", label: `Users (${users.length})` },
    { key: "products", label: "Products" },
    { key: "purchases", label: "Purchases" },
    { key: "activity", label: "Activity" },
    { key: "wallet", label: "Platform Wallet" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Admin Portal</h1>
          <p className="mt-1 text-zinc-500">Full platform visibility — users, products, revenue, activity</p>
        </div>
        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Admin</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200 mb-8">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-b-2 border-rose-500 text-rose-600"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-zinc-200" />
          ))}
        </div>
      ) : tab === "overview" && stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Users" value={stats.usersCount} sub={`+${stats.newUsersThisWeek} this week`} color="blue" />
          <StatCard label="New This Week" value={stats.newUsersThisWeek} color="green" />
          <StatCard label="Total Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} color="amber" />
          <StatCard label="Total Purchases" value={stats.purchasesCount} />
          <StatCard label="All Products" value={stats.productsCount} sub={`${stats.publishedProductsCount} published`} />
          <StatCard label="Published Products" value={stats.publishedProductsCount} color="green" />
          <StatCard label="Total Posts" value={stats.postsCount} />
          <StatCard label="Communities" value={stats.channelsCount} />
        </div>

      ) : tab === "users" ? (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <input
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name, email, or username…"
              className="w-full max-w-sm rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm outline-none focus:border-zinc-400 focus:bg-white"
            />
            <span className="text-sm text-zinc-500">{filteredUsers.length} of {users.length}</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">User</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-zinc-600">Products</th>
                  <th className="px-4 py-3 text-center font-medium text-zinc-600">Sales</th>
                  <th className="px-4 py-3 text-center font-medium text-zinc-600">Purchases</th>
                  <th className="px-4 py-3 text-center font-medium text-zinc-600">Posts</th>
                  <th className="px-4 py-3 text-center font-medium text-zinc-600">Communities</th>
                  <th className="px-4 py-3 text-center font-medium text-zinc-600">Followers</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">Joined</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600"></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar user={u} size={8} />
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-900 truncate max-w-[140px]">{u.name}</p>
                          <p className="text-xs text-zinc-400 truncate max-w-[140px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === "admin" ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-600"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.banned ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Banned</span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-700">{u._count.products}</td>
                    <td className="px-4 py-3 text-center text-zinc-700">{u._count.sales}</td>
                    <td className="px-4 py-3 text-center text-zinc-700">{u._count.purchases}</td>
                    <td className="px-4 py-3 text-center text-zinc-700">{u._count.posts}</td>
                    <td className="px-4 py-3 text-center text-zinc-700">{u._count.channels}</td>
                    <td className="px-4 py-3 text-center text-zinc-700">{u._count.followers}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openUserDetail(u.id)}
                          className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 transition-colors whitespace-nowrap"
                        >
                          View
                        </button>
                        {u.role !== "admin" && (
                          <button
                            onClick={() => handleBanToggle(u)}
                            disabled={banningId === u.id}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-50 ${
                              u.banned ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                            }`}
                          >
                            {banningId === u.id ? "..." : u.banned ? "Unban" : "Ban"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* User detail panel */}
          {(userDetailLoading || selectedUser) && (
            <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              {userDetailLoading ? (
                <div className="h-48 animate-pulse rounded-xl bg-zinc-100" />
              ) : selectedUser ? (
                <>
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <Avatar user={selectedUser} size={12} />
                      <div>
                        <h3 className="text-lg font-bold text-zinc-900">{selectedUser.name}</h3>
                        <p className="text-sm text-zinc-500">{selectedUser.email}</p>
                        {selectedUser.username && <p className="text-xs text-zinc-400">@{selectedUser.username}</p>}
                        {selectedUser.bio && <p className="mt-1 text-sm text-zinc-600 max-w-md">{selectedUser.bio}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-amber-600">${selectedUser.totalRevenue.toFixed(2)} earned</span>
                      {selectedUser.banned ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Banned</span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                      )}
                      {selectedUser.role !== "admin" && (
                        <button
                          onClick={() => handleBanToggle(selectedUser)}
                          disabled={banningId === selectedUser.id}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                            selectedUser.banned ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                          }`}
                        >
                          {banningId === selectedUser.id ? "..." : selectedUser.banned ? "Unban" : "Ban"}
                        </button>
                      )}
                      <button onClick={() => setSelectedUser(null)} className="ml-2 rounded-lg p-1.5 hover:bg-zinc-100 text-zinc-400">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Activity counts */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
                    {[
                      ["Products", selectedUser._count.products],
                      ["Sales", selectedUser._count.sales],
                      ["Purchases", selectedUser._count.purchases],
                      ["Posts", selectedUser._count.posts],
                      ["Followers", selectedUser._count.followers],
                    ].map(([label, count]) => (
                      <div key={label as string} className="rounded-lg bg-zinc-50 p-3 text-center">
                        <p className="text-lg font-bold text-zinc-900">{count}</p>
                        <p className="text-xs text-zinc-500">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Products */}
                    {selectedUser.products.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-700 mb-2">Products</h4>
                        <div className="space-y-2">
                          {selectedUser.products.map((p) => (
                            <div key={p.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                              <div>
                                <p className="text-sm font-medium text-zinc-900">{p.title}</p>
                                <p className="text-xs text-zinc-500 capitalize">{p.type} · ${p.price.toFixed(2)} · {p._count.purchases} sales</p>
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-xs ${p.published ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-500"}`}>
                                {p.published ? "Live" : "Draft"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent sales */}
                    {selectedUser.sales.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-700 mb-2">Recent Sales</h4>
                        <div className="space-y-2">
                          {selectedUser.sales.slice(0, 8).map((s) => (
                            <div key={s.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                              <div>
                                <p className="text-sm text-zinc-900">{s.product?.title ?? "Item"}</p>
                                <p className="text-xs text-zinc-500">{s.buyer.name} · {s.buyer.email}</p>
                              </div>
                              <span className="text-sm font-semibold text-amber-600">${s.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent posts */}
                    {selectedUser.posts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-700 mb-2">Recent Posts</h4>
                        <div className="space-y-2">
                          {selectedUser.posts.map((p) => (
                            <div key={p.id} className="rounded-lg bg-zinc-50 px-3 py-2">
                              <p className="text-sm text-zinc-800 line-clamp-2">{p.content}</p>
                              <p className="mt-1 text-xs text-zinc-400">
                                {p._count.likes} likes · {p._count.comments} comments · {new Date(p.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Communities */}
                    {selectedUser.channels.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-700 mb-2">Communities</h4>
                        <div className="space-y-2">
                          {selectedUser.channels.map((c) => (
                            <div key={c.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                              <div>
                                <p className="text-sm font-medium text-zinc-900">{c.name}</p>
                                <p className="text-xs text-zinc-500">{c._count.channelFollows} members · {c._count.posts} posts</p>
                              </div>
                              {c.price > 0 && <span className="text-xs font-semibold text-amber-600">${c.price}/mo</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

      ) : tab === "products" ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Title</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Price</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Creator</th>
                <th className="px-4 py-3 text-center font-medium text-zinc-600">Sales</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Status</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900 max-w-[200px] truncate">{p.title}</td>
                  <td className="px-4 py-3 capitalize text-zinc-600">{p.type}</td>
                  <td className="px-4 py-3 font-medium">${p.price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <p className="text-zinc-800">{p.seller.name}</p>
                    <p className="text-xs text-zinc-400">{p.seller.email}</p>
                  </td>
                  <td className="px-4 py-3 text-center">{p._count.purchases}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.published ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-500"
                    }`}>
                      {p.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => handlePublishToggle(p)}
                      disabled={productActionId === p.id}
                      className="text-xs font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
                    >
                      {p.published ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p)}
                      disabled={productActionId === p.id}
                      className="text-xs font-medium text-rose-600 hover:text-rose-800 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : tab === "purchases" ? (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={exportPurchasesCsv}
              disabled={purchases.length === 0}
              title="Full platform transaction log for accounting/audit"
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export audit CSV
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Product / Channel</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Buyer</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Seller</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Date</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900 max-w-[180px] truncate">
                    {p.product?.title ?? p.channel?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-zinc-800">{p.buyer.name}</p>
                    <p className="text-xs text-zinc-400">{p.buyer.email}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{p.seller.name}</td>
                  <td className="px-4 py-3 font-semibold text-amber-600">${p.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {p.refunded ? (
                      <span className="rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Refunded</span>
                    ) : p.refundRequestedAt ? (
                      <span
                        className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700"
                        title={p.refundReason ? `Reason: ${p.refundReason}` : undefined}
                      >
                        Requested
                      </span>
                    ) : (
                      <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">Paid</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {!p.refunded && p.refundRequestedAt && (
                      <button
                        onClick={() => handleReject(p)}
                        disabled={rejectingId === p.id || refundingId === p.id}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
                      >
                        {rejectingId === p.id ? "Declining..." : "Decline"}
                      </button>
                    )}
                    {!p.refunded && (
                      <button
                        onClick={() => handleRefund(p)}
                        disabled={refundingId === p.id || rejectingId === p.id}
                        className="text-xs font-medium text-rose-600 hover:text-rose-800 disabled:opacity-50"
                      >
                        {refundingId === p.id ? "Refunding..." : p.refundRequestedAt ? "Approve" : "Refund"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

      ) : tab === "activity" ? (
        <div className="space-y-2">
          {activity.length === 0 ? (
            <p className="py-16 text-center text-zinc-400">No recent activity.</p>
          ) : (
            activity.map((event) => (
              <div key={`${event.type}-${event.id}`} className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-white px-4 py-3 shadow-sm hover:border-zinc-200 transition-colors">
                {eventTypeIcon(event.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Avatar user={event.user} size={6} />
                    <p className="text-sm text-zinc-800">{event.label}</p>
                  </div>
                  {event.type === "post" && (
                    <p className="mt-1 text-xs text-zinc-400 line-clamp-1">{event.content}</p>
                  )}
                  {event.type === "post" && (
                    <p className="mt-0.5 text-xs text-zinc-400">{event.likes} likes · {event.comments} comments</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {event.type === "purchase" && (
                    <p className="text-sm font-semibold text-amber-600">${event.amount.toFixed(2)}</p>
                  )}
                  <p className="text-xs text-zinc-400 whitespace-nowrap">
                    {new Date(event.createdAt).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === "wallet" && platformWallet ? (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Platform Wallet Balance" value={`$${platformWallet.balance.toFixed(2)}`} sub="Ailexity's accumulated commission" color="amber" />
            <StatCard label="Total Commission" value={`$${platformWallet.totalCommissionFromPurchases.toFixed(2)}`} sub={`from ${platformWallet.purchasesCount} purchase(s)`} color="green" />
            <StatCard label="Total GMV" value={`$${platformWallet.totalGMV.toFixed(2)}`} sub="Gross merchandise value" color="blue" />
            <StatCard label="Total Seller Payouts" value={`$${platformWallet.totalSellerPayouts.toFixed(2)}`} />
          </div>

          <div>
            <h3 className="mb-3 text-lg font-bold text-zinc-900">Top Sellers by Earnings</h3>
            {platformWallet.topSellers.length === 0 ? (
              <p className="text-sm text-zinc-400">No sales yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50">
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">Seller</th>
                      <th className="px-4 py-3 text-center font-medium text-zinc-600">Sales</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-600">Total Sales ($)</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-600">Commission Paid</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-600">Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformWallet.topSellers.map((row, i) => (
                      <tr key={row.seller?.id ?? i} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-zinc-900">{row.seller?.name ?? "Unknown"}</p>
                          <p className="text-xs text-zinc-400">{row.seller?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-zinc-700">{row.salesCount}</td>
                        <td className="px-4 py-3 text-right text-zinc-700">${row.totalSales.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-zinc-500">${row.totalCommission.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-600">${row.totalEarnings.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-lg font-bold text-zinc-900">Recent Commission Activity</h3>
            {platformWallet.recentPurchases.length === 0 ? (
              <p className="text-sm text-zinc-400">No commission activity yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50">
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">Item</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">Buyer</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">Seller</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-600">Amount</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-600">Commission</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformWallet.recentPurchases.map((p) => (
                      <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-zinc-900 max-w-[160px] truncate">{p.product?.title ?? p.channel?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-zinc-600">{p.buyer.name}</td>
                        <td className="px-4 py-3 text-zinc-600">{p.seller.name}</td>
                        <td className="px-4 py-3 text-right text-zinc-700">${p.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-600">${p.commissionAmount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">{new Date(p.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
