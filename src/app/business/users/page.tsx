"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";

type Sale = {
  id: string;
  amount: number;
  createdAt: string;
  buyer: { name: string; email: string };
};

function UsersContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "product";
  const id = searchParams.get("id") || searchParams.get("productId") || "";
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedEntity, setFetchedEntity] = useState<any>(null);

  useEffect(() => {
    if (id) {
      const apiUrl = type === "community" ? `/api/channels/${id}` : `/api/products/${id}`;
      fetch(apiUrl)
        .then(async (r) => {
          if (!r.ok) {
            const error = await r.text();
            throw new Error(error || `Request failed with status ${r.status}`);
          }
          return r.json();
        })
        .then((p) => setFetchedEntity(p))
        .catch(console.error);
    } else {
      setFetchedEntity(null);
    }
  }, [id, type]);

  useEffect(() => {
    if (user) {
      setLoading(true);
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
        .then((s) => setSales(s))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, id, type]);

  const entityTitle = fetchedEntity ? (fetchedEntity.title || fetchedEntity.name) : "";
  const title = fetchedEntity ? `Users — ${entityTitle}` : "Users";

  const uniqueUsersMap = new Map<string, { name: string; email: string; totalSpend: number; joinedAt: string }>();
  sales.forEach(sale => {
    const existing = uniqueUsersMap.get(sale.buyer.email);
    if (!existing) {
      uniqueUsersMap.set(sale.buyer.email, {
        name: sale.buyer.name,
        email: sale.buyer.email,
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

  const uniqueUsers = Array.from(uniqueUsersMap.values());

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

      <div className="mb-6 flex gap-6 border-b border-zinc-200">
        <button className="border-b-2 border-amber-500 pb-3 text-sm font-semibold text-amber-900">Users</button>
        <button className="pb-3 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition">Memberships</button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50">
           <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
           Date joined
        </button>
        
        <div className="flex items-center gap-2 text-sm font-medium">
          <button className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-700 shadow-sm hover:bg-zinc-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-700 shadow-sm hover:bg-zinc-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Edit
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white border border-zinc-200 rounded-t-xl rounded-b-xl overflow-hidden shadow-sm flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-12 border-b border-zinc-200 bg-white px-4 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
           <div className="col-span-2">User</div>
           <div className="col-span-2 border-dotted border-b border-zinc-300 w-fit cursor-pointer">Email</div>
           <div className="col-span-1 border-dotted border-b border-zinc-300 w-fit cursor-pointer">Status</div>
           <div className="col-span-1 border-dotted border-b border-zinc-300 w-fit cursor-pointer">Country</div>
           <div className="col-span-1 border-dotted border-b border-zinc-300 w-fit cursor-pointer">Total spend</div>
           <div className="col-span-2 flex items-center gap-1 group cursor-pointer text-zinc-900 border-none">Joined at <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg></div>
           <div className="col-span-2 border-dotted border-b border-zinc-300 w-fit cursor-pointer">Last accessed</div>
           <div className="col-span-1">Contact</div>
        </div>

        {/* Table Rows or Empty Data */}
        {uniqueUsers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
             <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-zinc-200 text-3xl">
               👥
             </div>
             <h3 className="text-lg font-bold text-zinc-900 mb-1">No users yet</h3>
             <p className="text-sm text-zinc-500 mb-8">Share your products to get your first customers!</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {uniqueUsers.map((u, i) => (
              <div key={i} className="grid grid-cols-12 items-center border-b border-zinc-100 px-4 py-3 text-sm hover:bg-zinc-50 transition">
                 <div className="col-span-2 flex items-center gap-2">
                   <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[10px] font-bold text-white shadow-sm">
                     {u.name.charAt(0).toUpperCase()}
                   </div>
                   <span className="truncate font-medium text-zinc-900">{u.name}</span>
                 </div>
                 <div className="col-span-2 truncate pr-2 text-zinc-600">{u.email}</div>
                 <div className="col-span-1">
                   <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">Joined</span>
                 </div>
                 <div className="col-span-1 text-zinc-500">Global</div>
                 <div className="col-span-1 font-medium text-zinc-500">${u.totalSpend.toFixed(2)}</div>
                 <div className="col-span-2 text-zinc-900">{new Date(u.joinedAt).toLocaleDateString()}</div>
                 <div className="col-span-2 text-zinc-900">Active</div>
                 <div className="col-span-1 flex items-center gap-3 text-zinc-400">
                   <button className="hover:text-zinc-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg></button>
                   <button className="hover:text-zinc-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
         <div>Showing {uniqueUsers.length} to {uniqueUsers.length} of {uniqueUsers.length}</div>
         <div className="flex items-center gap-1">
           <button className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">«</button>
           <button className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">‹</button>
           <button className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">›</button>
           <button className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">»</button>
         </div>
      </div>
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
