"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";

type Stats = {
  totalRevenue: number;
  totalSales: number;
  productsLive: number;
  customers: number;
};

function AnalyticsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const type = searchParams.get("type") || "product";
  const queryId = searchParams.get("id") || searchParams.get("productId") || "";
  const [selectedId, setSelectedId] = useState<string>(queryId);
  const [fetchedEntity, setFetchedEntity] = useState<any>(null);

  useEffect(() => {
    const id = searchParams.get("id") || searchParams.get("productId") || "";
    setSelectedId(id);
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
        .then((data) => setFetchedEntity(data))
        .catch(console.error);
    } else {
      setFetchedEntity(null);
    }
  }, [searchParams, type]);

  useEffect(() => {
    if (user) {
      fetch("/api/my-products")
        .then(async (r) => {
          if (!r.ok) {
            const error = await r.text();
            throw new Error(error || `Request failed with status ${r.status}`);
          }
          return r.json();
        })
        .then((p) => setProducts(p))
        .catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const url = selectedId 
        ? `/api/dashboard/stats?${type === 'community' ? 'channelId' : 'productId'}=${selectedId}` 
        : "/api/dashboard/stats";
      
      fetch(url)
        .then(async (r) => {
          if (!r.ok) {
            const error = await r.text();
            throw new Error(error || `Request failed with status ${r.status}`);
          }
          return r.json();
        })
        .then((s) => setStats(s))
        .catch(console.error);
    }
  }, [user, selectedId, type]);

  const selectedProduct = products.find((product) => product.id === selectedId) || fetchedEntity;
  const entityTitle = selectedProduct ? (selectedProduct.title || selectedProduct.name) : "";
  const title = selectedProduct ? `Analytics — ${entityTitle}` : "Analytics";

  const setProductInUrl = (id: string) => {
    const params = new URLSearchParams();
    if (id) {
      params.set("type", "product");
      params.set("id", id);
    }
    router.replace(`/business/analytics${id ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="p-8 font-sans w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 items-start justify-between mb-8 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {selectedProduct
              ? `Showing ${type} analytics for ${entityTitle}.`
              : "Select a product from the list below to view analysis for a specific product."}
          </p>
        </div>
        <button className="text-zinc-500 hover:text-zinc-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        </button>
      </div>

      <div className="flex gap-6 items-start">
        {/* Main Chart Area placeholder */}
        <div className="flex-1 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm relative h-96">
          <div className="flex items-center gap-12 mb-8">
            <div>
              <div className="text-sm font-medium text-zinc-500">Gross revenue</div>
              <div className="font-semibold text-zinc-900 mt-1">--</div>
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-500">Yesterday</div>
              <div className="font-semibold text-zinc-900 mt-1">--</div>
            </div>
          </div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-500">No data available</span>
          </div>

          <div className="absolute bottom-6 left-6 text-xs text-zinc-400">12:00 AM</div>
          <div className="absolute bottom-6 right-6 text-xs text-zinc-400">12:00 AM</div>
          
          {/* Faint vertical grid lines */}
          <div className="absolute bottom-12 left-6 right-6 top-32 flex justify-between">
             {[...Array(24)].map((_, i) => (
                <div key={i} className="w-[1px] h-full bg-zinc-100" />
             ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 shrink-0 space-y-6">
          <div className="bg-white/80 p-6 rounded-xl border border-zinc-200 shadow-sm backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm font-medium text-zinc-900">Total balance</div>
              <a href="/business/balances" className="text-sm font-medium text-amber-600 hover:text-amber-700 transition">View</a>
            </div>
            <div className="text-3xl font-bold text-zinc-900 mb-1">$0.00</div>
            <div className="text-xs font-medium text-zinc-500 mb-4">$0.00 available</div>
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 flex items-center gap-2">
              ⚠️ You&apos;re missing out on additional revenue
            </div>
          </div>

          <div className="bg-white/80 p-6 rounded-xl border border-zinc-200 shadow-sm backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm font-medium text-zinc-900">Payouts</div>
              <a href="/business/payments" className="text-sm font-medium text-amber-600 hover:text-amber-700 transition">View</a>
            </div>
            <div className="text-zinc-900 font-semibold">--</div>
          </div>
        </div>
      </div>
      
      {/* Banner */}
      <div className="mt-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
           <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
           <span className="text-amber-600 font-semibold cursor-pointer">Start marketing</span> your products across social platforms.
        </div>
        <button className="text-zinc-400 hover:text-zinc-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Stats Table Area */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-zinc-900 mb-4">Stats</h2>
        <div className="flex items-center gap-4 mb-6">
           <button className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 flex items-center gap-2">
             Last 7 days <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
           </button>
           <button className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 flex items-center gap-2">
             <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             Mar 23 - 29, 2026
           </button>
           <span className="text-sm text-zinc-500">compared to</span>
           <button className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 flex items-center gap-2">
             Previous period <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
           </button>
           <button className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 flex items-center gap-2">
             Daily <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
           </button>
           <span className="text-sm text-zinc-500">on</span>
           <select 
             className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 outline-none hover:bg-zinc-50 cursor-pointer appearance-none pr-8 relative"
             style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E")`, backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat' }}
             value={selectedId}
             onChange={(e) => {
               setSelectedId(e.target.value);
               setProductInUrl(e.target.value);
             }}
           >
             <option value="">All products</option>
             {products.map((p) => (
               <option key={p.id} value={p.id}>{p.title}</option>
             ))}
             {selectedId && !products.find(p => p.id === selectedId) && fetchedEntity && (
               <option key={selectedId} value={selectedId}>{entityTitle}</option>
             )}
           </select>
           
           <div className="ml-auto flex items-center gap-2">
             <button className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 flex items-center gap-2 hover:bg-zinc-50">
               + Add
             </button>
             <button className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 flex items-center gap-2 hover:bg-zinc-50">
               <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
               Edit
             </button>
           </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex items-start justify-between">
            <div>
               <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1 border-b border-zinc-300 border-dashed inline-block pb-0.5">Gross revenue</div>
               <div className="text-2xl font-bold text-zinc-900">${(stats?.totalRevenue ?? 0).toFixed(2)}</div>
            </div>
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex items-start justify-between">
            <div>
               <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1 border-b border-zinc-300 border-dashed inline-block pb-0.5">Total Sales</div>
               <div className="text-2xl font-bold text-zinc-900">{stats?.totalSales ?? 0}</div>
            </div>
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex items-start justify-between">
            <div>
               <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1 border-b border-zinc-300 border-dashed inline-block pb-0.5">Customers</div>
               <div className="text-2xl font-bold text-zinc-900">{stats?.customers ?? 0}</div>
            </div>
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    }>
      <AnalyticsContent />
    </Suspense>
  );
}
