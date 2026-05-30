"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Stats = {
  usersCount: number;
  productsCount: number;
  purchasesCount: number;
  totalRevenue: number;
  buyersCount: number;
  sellersCount: number;
};

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  _count: { products: number; purchases: number; sales: number };
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
  createdAt: string;
  product: { title: string };
  buyer: { name: string; email: string };
  seller: { name: string };
};

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [tab, setTab] = useState<"overview" | "users" | "products" | "purchases">("overview");
  const [loading, setLoading] = useState(true);

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
      ]).then(([s, u, p, pur]) => {
        setStats(s);
        setUsers(u);
        setProducts(p);
        setPurchases(pur);
      }).finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) return null;
  if (user.role !== "admin") return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-zinc-900">Admin Panel</h1>
      <p className="mt-2 text-zinc-600">Full access to users, products, and sales</p>

      <div className="mt-8 flex gap-2 border-b border-zinc-200">
        {(["overview", "users", "products", "purchases"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-medium capitalize ${
              tab === t
                ? "border-b-2 border-rose-500 text-rose-600"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 h-64 animate-pulse rounded-xl bg-zinc-200" />
      ) : tab === "overview" && stats ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Total Users</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{stats.usersCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Products</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{stats.productsCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Purchases</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{stats.purchasesCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Total Revenue</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              ${stats.totalRevenue.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Buyers</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{stats.buyersCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-500">Sellers</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{stats.sellersCount}</p>
          </div>
        </div>
      ) : tab === "users" ? (
        <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Products</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Purchases</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Sales</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">{u.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{u.email}</td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        u.role === "admin"
                          ? "bg-rose-100 text-rose-700"
                          : u.role === "seller"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">{u._count.products}</td>
                  <td className="px-4 py-3">{u._count.purchases}</td>
                  <td className="px-4 py-3">{u._count.sales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === "products" ? (
        <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Price</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Seller</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Sales</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">{p.title}</td>
                  <td className="px-4 py-3 capitalize text-zinc-600">{p.type}</td>
                  <td className="px-4 py-3">${p.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.seller.name}</td>
                  <td className="px-4 py-3">{p._count.purchases}</td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        p.published ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {p.published ? "Published" : "Draft"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Product</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Buyer</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Seller</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3 font-medium text-zinc-900">{p.product.title}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.buyer.name} ({p.buyer.email})</td>
                  <td className="px-4 py-3 text-zinc-600">{p.seller.name}</td>
                  <td className="px-4 py-3 font-medium text-amber-600">${p.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
