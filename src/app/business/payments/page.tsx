"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";

type Sale = {
  id: string;
  amount: number;
  createdAt: string;
  product: { title: string; type: string };
  buyer: { name: string; email: string };
};

function PaymentsList() {
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
  const title = fetchedEntity ? `Payments — ${entityTitle}` : "Payments";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8 font-sans w-full max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {fetchedEntity
            ? `Showing payments for ${entityTitle}.`
            : "View and manage all payments received from your customers."}
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 text-sm font-medium">
          <button className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 shadow-sm">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Status
          </button>
          <button className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 shadow-sm">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Method
          </button>
          <button className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 shadow-sm">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Date
          </button>
          <button className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 shadow-sm">
            <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Reason
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-500 hover:bg-zinc-50 shadow-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm">
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm">
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Edit
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white border border-zinc-200 rounded-t-xl rounded-b-xl overflow-hidden shadow-sm flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-11 border-b border-zinc-200 bg-white px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
           <div className="col-span-1 flex items-center gap-1 group cursor-pointer">Amount <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg></div>
           <div className="col-span-1 border-dotted border-b border-zinc-300 w-fit cursor-pointer">Status</div>
           <div className="col-span-1 border-dotted border-b border-zinc-300 w-fit cursor-pointer">Product</div>
           <div className="col-span-1 border-dotted border-b border-zinc-300 w-fit cursor-pointer">Plan</div>
           <div className="col-span-1 border-dotted border-b border-zinc-300 w-fit cursor-pointer">Method</div>
           <div className="col-span-1 border-dotted border-b border-zinc-300 w-fit cursor-pointer">Reason</div>
           <div className="col-span-1 border-dotted border-b border-zinc-300 w-fit cursor-pointer">User</div>
           <div className="col-span-2 border-dotted border-b border-zinc-300 w-fit cursor-pointer">Email</div>
           <div className="col-span-1 border-dotted border-b border-zinc-300 w-fit cursor-pointer">Promo code</div>
           <div className="col-span-1 border-dotted border-b border-zinc-300 w-fit cursor-pointer">Paid</div>
        </div>

        {/* Table Rows or Empty Data */}
        {sales.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
             <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-zinc-200 text-3xl">
               💵
             </div>
             <h3 className="text-lg font-bold text-zinc-900 mb-1">No payments yet</h3>
             <p className="text-sm text-zinc-500 mb-8">No payments match your filters</p>
             
             <div className="rounded-xl border border-zinc-200 bg-white p-2 flex items-center shadow-sm">
               <span className="px-3 text-sm font-medium text-zinc-600">Collect payments via the API.</span>
               <button className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Copy prompt
               </button>
               <button className="px-3 text-sm font-medium text-zinc-900 hover:text-zinc-600">
                 View docs
               </button>
             </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {sales.map((sale) => (
              <div key={sale.id} className="grid grid-cols-11 border-b border-zinc-100 px-4 py-3 text-sm hover:bg-zinc-50 transition items-center">
                 <div className="col-span-1 font-semibold text-zinc-900">${sale.amount.toFixed(2)}</div>
                 <div className="col-span-1"><span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">Paid</span></div>
                 <div className="col-span-1 text-zinc-700 truncate pr-2">{sale.product.title}</div>
                 <div className="col-span-1 text-zinc-500 capitalize">{sale.product.type}</div>
                 <div className="col-span-1 text-zinc-500">Card</div>
                 <div className="col-span-1 text-zinc-500">Purchase</div>
                 <div className="col-span-1 text-zinc-900 truncate">{sale.buyer.name}</div>
                 <div className="col-span-2 text-zinc-500 truncate pr-2">{sale.buyer.email}</div>
                 <div className="col-span-1 text-zinc-400">---</div>
                 <div className="col-span-1 text-sm text-zinc-500">{new Date(sale.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsList />
    </Suspense>
  );
}
