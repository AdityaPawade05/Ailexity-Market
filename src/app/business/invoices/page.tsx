"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";

type Invoice = {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  description: string | null;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  product?: { title: string };
};

function InvoicesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId") || searchParams.get("id") || "";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    customerName: "",
    customerEmail: "",
    description: "",
    dueDate: "",
  });

  const fetchInvoices = useCallback(() => {
    if (user) {
      const url = productId
        ? `/api/invoices?productId=${productId}`
        : "/api/invoices";

      fetch(url)
        .then(async (r) => {
          if (!r.ok) {
            const error = await r.text();
            throw new Error(error || `Request failed with status ${r.status}`);
          }
          return r.json();
        })
        .then((s) => setInvoices(Array.isArray(s) ? s : []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, productId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          productId: productId || null,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        fetchInvoices();
        setFormData({ amount: "", customerName: "", customerEmail: "", description: "", dueDate: "" });
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-8 font-sans w-full max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Invoices</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage and send invoices to your customers.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 shadow-sm transition"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Create invoice
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-6 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">
          <div className="col-span-1">Invoice ID</div>
          <div className="col-span-1">Customer</div>
          <div className="col-span-1">Amount</div>
          <div className="col-span-1">Due Date</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Created</div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">No invoices found.</div>
        ) : (
          invoices.map((inv) => (
            <div key={inv.id} className="grid grid-cols-6 border-b border-zinc-100 px-4 py-3 text-sm hover:bg-zinc-50 transition">
              <div className="col-span-1 font-mono text-zinc-600 text-xs">#{inv.id.slice(-8)}</div>
              <div className="col-span-1">
                <div className="font-medium text-zinc-900">{inv.customerName}</div>
                <div className="text-xs text-zinc-500">{inv.customerEmail}</div>
              </div>
              <div className="col-span-1 font-semibold text-zinc-900">${inv.amount.toFixed(2)}</div>
              <div className="col-span-1 text-zinc-500">{new Date(inv.dueDate).toLocaleDateString()}</div>
              <div className="col-span-1">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  inv.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {inv.status}
                </span>
              </div>
              <div className="col-span-1 text-zinc-400">{new Date(inv.createdAt).toLocaleDateString()}</div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create New Invoice</h2>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Customer Name</label>
                <input 
                  required 
                  type="text" 
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm outline-none focus:border-amber-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Customer Email</label>
                <input 
                  required 
                  type="email" 
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm outline-none focus:border-amber-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Amount (USD)</label>
                <input 
                  required 
                  type="number" 
                  step="0.01" 
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm outline-none focus:border-amber-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Due Date</label>
                <input 
                  required 
                  type="date" 
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm outline-none focus:border-amber-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm outline-none focus:border-amber-500" 
                  rows={3}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700 shadow-sm"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={null}>
      <InvoicesContent />
    </Suspense>
  );
}
