"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";

type Sale = {
  id: string;
  amount: number;
  createdAt: string;
  refunded: boolean;
  buyer: { name: string; email: string; location: string | null };
};

type EntitySummary = { id: string; title?: string; name?: string };

type UniqueUser = { name: string; email: string; location: string | null; totalSpend: number; joinedAt: string };

const PAGE_SIZE = 20;

function downloadCsv(rows: UniqueUser[]) {
  const header = ["Name", "Email", "Location", "Total Spend", "Joined At"];
  const lines = rows.map((u) => [u.name, u.email, u.location || "", u.totalSpend.toFixed(2), new Date(u.joinedAt).toISOString()]);
  const csv = [header, ...lines]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function UsersContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "product";
  const id = searchParams.get("id") || searchParams.get("productId") || "";
  const salesKey = `${type}|${id}`;
  const [salesResult, setSalesResult] = useState<{ key: string; sales: Sale[] } | null>(null);
  const [fetched, setFetched] = useState<{ id: string; entity: EntitySummary } | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!id) return;
    const apiUrl = type === "community" ? `/api/channels/${id}` : `/api/products/${id}`;
    fetch(apiUrl)
      .then(async (r) => {
        if (!r.ok) {
          const error = await r.text();
          throw new Error(error || `Request failed with status ${r.status}`);
        }
        return r.json();
      })
      .then((p) => setFetched({ id, entity: p?.channel ?? p }))
      .catch(console.error);
  }, [id, type]);

  useEffect(() => {
    if (user) {
      const queryKey = type === 'community' ? 'channelId' : 'productId';
      const url = id
        ? `/api/purchases?as=seller&${queryKey}=${id}`
        : "/api/purchases?as=seller";

      fetch(url)
        .then(async (r) => {
          if (!r.ok) {
            const error = await r.text();
            throw new Error(error || `Request failed with status ${r.status}`);
          }
          return r.json();
        })
        .then((s) => setSalesResult({ key: salesKey, sales: Array.isArray(s) ? s : [] }))
        .catch(console.error);
    }
  }, [user, id, type, salesKey]);

  // Derive view state — stale results (from a previous selection) are ignored.
  const fetchedEntity = fetched?.id === id ? fetched.entity : null;

  const entityTitle = fetchedEntity ? (fetchedEntity.title || fetchedEntity.name) : "";
  const title = fetchedEntity ? `Users — ${entityTitle}` : "Users";

  const uniqueUsers = useMemo(() => {
    const sales = salesResult?.key === salesKey ? salesResult.sales : [];
    const map = new Map<string, UniqueUser>();
    sales.filter((sale) => !sale.refunded).forEach((sale) => {
      const existing = map.get(sale.buyer.email);
      if (!existing) {
        map.set(sale.buyer.email, {
          name: sale.buyer.name,
          email: sale.buyer.email,
          location: sale.buyer.location,
          totalSpend: sale.amount,
          joinedAt: sale.createdAt
        });
      } else {
        existing.totalSpend += sale.amount;
        if (new Date(sale.createdAt) < new Date(existing.joinedAt)) {
          existing.joinedAt = sale.createdAt;
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const diff = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
  }, [salesResult, salesKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(uniqueUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageUsers = uniqueUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="p-8 font-sans w-full max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {fetchedEntity
            ? `Showing users who purchased ${entityTitle}.`
            : "View and manage all your customers and members."}
        </p>
      </div>

      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => downloadCsv(uniqueUsers)}
          disabled={uniqueUsers.length === 0}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export CSV
        </button>
      </div>

      <div className="flex-1 bg-white border border-zinc-200 rounded-t-xl rounded-b-xl overflow-hidden shadow-sm flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-10 border-b border-zinc-200 bg-white px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
           <div className="col-span-2">User</div>
           <div className="col-span-3">Email</div>
           <div className="col-span-1">Status</div>
           <div className="col-span-1">Location</div>
           <div className="col-span-1">Total spend</div>
           <button
             onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
             className="col-span-2 flex items-center gap-1 group cursor-pointer text-zinc-900 text-left"
           >
             Joined at
             <svg className={`w-3 h-3 text-zinc-400 transition ${sortDir === "asc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
           </button>
        </div>

        {/* Table Rows or Empty Data */}
        {pageUsers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
             <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-zinc-200 text-3xl">
               👥
             </div>
             <h3 className="text-lg font-bold text-zinc-900 mb-1">No users yet</h3>
             <p className="text-sm text-zinc-500 mb-8">Share your products to get your first customers!</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {pageUsers.map((u) => (
              <div key={u.email} className="grid grid-cols-10 items-center border-b border-zinc-100 px-4 py-3 text-sm hover:bg-zinc-50 transition">
                 <div className="col-span-2 flex items-center gap-2">
                   <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[10px] font-bold text-white shadow-sm">
                     {u.name.charAt(0).toUpperCase()}
                   </div>
                   <span className="truncate font-medium text-zinc-900">{u.name}</span>
                 </div>
                 <div className="col-span-3 truncate pr-2 text-zinc-600">{u.email}</div>
                 <div className="col-span-1">
                   <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">Joined</span>
                 </div>
                 <div className="col-span-1 text-zinc-500 truncate pr-2">{u.location || "Unknown"}</div>
                 <div className="col-span-1 font-medium text-zinc-500">${u.totalSpend.toFixed(2)}</div>
                 <div className="col-span-2 flex items-center justify-between text-zinc-900 pr-2">
                   {new Date(u.joinedAt).toLocaleDateString()}
                   <a href={`mailto:${u.email}`} title={`Email ${u.name}`} className="text-zinc-400 hover:text-amber-600">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                   </a>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {uniqueUsers.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
           <div>
             Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, uniqueUsers.length)} of {uniqueUsers.length}
           </div>
           <div className="flex items-center gap-1">
             <button onClick={() => setPage(1)} disabled={currentPage === 1} className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40">«</button>
             <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40">‹</button>
             <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount} className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40">›</button>
             <button onClick={() => setPage(pageCount)} disabled={currentPage === pageCount} className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40">»</button>
           </div>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    }>
      <UsersContent />
    </Suspense>
  );
}
