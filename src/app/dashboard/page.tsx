"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  title: string;
  price: number;
  type: string;
  published: boolean;
  imageUrl: string | null;
  _count: { purchases: number };
};

type Stats = {
  totalRevenue: number;
  totalSales: number;
  productsLive: number;
  customers: number;
};
type Channel = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  followersCount: number;
  avatarUrl: string | null;
};

type Sale = {
  id: string;
  amount: number;
  createdAt: string;
  product?: { title: string; type: string } | null;
  channel?: { name: string; category: string } | null;
  buyer: { name: string; email: string };
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/my-products").then((r) => r.json()),
      fetch(`/api/channels?ownerId=${user.id}`).then((r) => r.json()),
      fetch("/api/dashboard/stats").then((r) => r.json()),
      fetch("/api/purchases?as=seller").then((r) => r.json()),
    ]).then(([prods, chans, s, salesData]) => {
      setProducts(prods);
      setChannels(Array.isArray(chans) ? chans : []);
      setStats(s);
      setSales(salesData);
    }).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
        return;
      }
    }
    if (user) {
      fetchData();
    }
  }, [user, authLoading, router, fetchData]);

  // Poll for live notifications every 15 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [user, fetchData]);

  async function togglePublish(id: string, published: boolean) {
    try {
      await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !published }),
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, published: !published } : p))
      );
      fetchData(); // Refresh stats
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await fetch(`/api/products/${id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      fetchData();
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteChannel(id: string) {
    if (!confirm("Delete this community? This cannot be undone.")) return;
    try {
      await fetch(`/api/channels/${id}`, { method: "DELETE" });
      setChannels((prev) => prev.filter((c) => c.id !== id));
      fetchData();
    } catch (e) {
      console.error(e);
    }
  }

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  function isNewNotification(createdAt: string) {
    return new Date(createdAt).getTime() > now - 60 * 60 * 1000; // Last hour
  }

  if (authLoading || !user) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Business Dashboard</h1>
          <p className="mt-2 text-zinc-600">Manage your products and communities</p>
        </div>
      </div>

      {/* Create Section */}
      <div className="mb-8 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-6">
        <div className="flex flex-col flex-wrap lg:flex-nowrap lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Start a new business</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Create a digital product, SaaS tool, or community to start earning.
            </p>
          </div>
          <div className="flex gap-3">
             <Link
              href="/channel/new"
              className="flex items-center gap-2 rounded-xl bg-white border border-zinc-200 px-6 py-3 font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              <span className="text-xl">+</span>
              Create Community
            </Link>
            <Link
              href="/dashboard/new"
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600"
            >
              <span className="text-xl">+</span>
              Create Product
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-200" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-zinc-200" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-zinc-500">Total Revenue</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                ${(stats?.totalRevenue ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-zinc-500">Total Sales</p>
              <p className="mt-2 text-2xl font-bold text-zinc-900">
                {stats?.totalSales ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-zinc-500">Products Live</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {stats?.productsLive ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-zinc-500">Customers</p>
              <p className="mt-2 text-2xl font-bold text-zinc-900">
                {stats?.customers ?? 0}
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Live Notifications */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                  <h3 className="font-semibold text-zinc-900">
                    Live Notifications
                    <span className="ml-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-green-500" title="Live" />
                  </h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {sales.length === 0 ? (
                    <div className="p-6 text-center text-sm text-zinc-500">
                      No sales yet. Share your products to get customers!
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100">
                      {sales.slice(0, 10).map((sale) => (
                        <div
                          key={sale.id}
                          className={`flex items-start gap-3 px-4 py-3 ${
                            isNewNotification(sale.createdAt) ? "bg-green-50/50" : ""
                          }`}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                            $
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-zinc-900">
                              {sale.buyer.name} purchased
                            </p>
                            <p className="truncate text-xs text-zinc-500">
                              {sale.product?.title || sale.channel?.name || "Access"}
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                              {new Date(sale.createdAt).toLocaleString()}
                              {isNewNotification(sale.createdAt) && (
                                <span className="ml-2 rounded bg-green-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                  New
                                </span>
                              )}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-amber-600">
                            ${sale.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Products + Sales */}
            <div className="lg:col-span-2 space-y-8">
              {/* My Businesses (Products + Channels) */}
              <div className="space-y-6">
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-zinc-900">My Communities</h2>
                  {channels.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-8 text-center">
                      <p className="text-zinc-600 text-sm">You haven&apos;t created any communities yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {channels.map((channel) => (
                        <div key={channel.id} className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-amber-300 transition">
                          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl">
                            {channel.avatarUrl ? (
                              <img src={channel.avatarUrl} alt={channel.name} className="h-full w-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                            ) : channel.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-zinc-900">{channel.name}</h3>
                            <p className="text-sm text-zinc-500">
                              {channel.followersCount} members · {channel.category || "Community"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => deleteChannel(channel.id)} className="rounded-lg bg-rose-100 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-200">
                              Delete
                            </button>
                            <Link href={`/business/home?type=community&id=${channel.id}`} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition shadow-sm">
                              Dashboard
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="mb-4 text-lg font-semibold text-zinc-900">My Products</h2>
                  {products.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-8 text-center">
                      <p className="text-zinc-600 text-sm">You haven&apos;t created any products yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {products.map((product) => (
                        <div key={product.id} className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:border-amber-300 transition">
                          <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xl">
                                {product.type === "saas" ? "💻" : product.type === "ebook" ? "📚" : "🎓"}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-zinc-900">{product.title}</h3>
                            <p className="text-sm text-zinc-500 capitalize">
                              ${product.price.toFixed(2)} · {product._count.purchases} sales · {product.type}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${product.published ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-600"}`}>
                              {product.published ? "Live" : "Draft"}
                            </span>
                            <button onClick={() => togglePublish(product.id, product.published)} className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200">
                              {product.published ? "Unpublish" : "Publish"}
                            </button>
                            <Link href={`/dashboard/edit/${product.id}`} className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200">
                              Edit Details
                            </Link>
                            <button onClick={() => deleteProduct(product.id)} className="rounded-lg bg-rose-100 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-200">
                              Delete
                            </button>
                            <Link href={`/business/home?type=product&id=${product.id}`} className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 transition shadow-sm ml-1">
                              Dashboard
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sales - Who Purchased */}
              <div>
                <h2 className="mb-4 text-lg font-semibold text-zinc-900">Sales History</h2>
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                  {sales.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">
                      No purchases yet
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-50">
                            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Customer</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Product</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Amount</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.map((sale) => (
                            <tr key={sale.id} className="border-b border-zinc-100 last:border-0">
                              <td className="px-4 py-3">
                                <p className="font-medium text-zinc-900">{sale.buyer.name}</p>
                                <p className="text-xs text-zinc-500">{sale.buyer.email}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-zinc-900">{sale.product?.title || sale.channel?.name || "Item"}</p>
                                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs capitalize text-zinc-600">
                                  {sale.product?.type || "Community"}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-amber-600">
                                ${sale.amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-zinc-500">
                                {new Date(sale.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
