"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";

type CheckoutLink = {
  id: string;
  title: string;
  amount: number;
  status: string;
  createdAt: string;
  product?: { title: string };
};

function CheckoutContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const productId = searchParams.get("productId") || searchParams.get("id") || "";
  const [links, setLinks] = useState<CheckoutLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
  });

  const fetchLinks = () => {
    if (user) {
      setLoading(true);
      const url = productId 
        ? `/api/checkout?productId=${productId}` 
        : "/api/checkout";
      
      fetch(url)
        .then(async (r) => {
          if (!r.ok) {
            const error = await r.text();
            throw new Error(error || `Request failed with status ${r.status}`);
          }
          return r.json();
        })
        .then((s) => setLinks(s))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [user, productId]);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          productId: productId || null,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        fetchLinks();
        setFormData({ title: "", amount: "" });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const copyToClipboard = (id: string) => {
    const url = `${window.location.origin}/checkout/${id}`;
    navigator.clipboard.writeText(url);
    alert("Checkout link copied to clipboard!");
  };

  return (
    <div className="p-8 font-sans w-full max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Checkout Links</h1>
          <p className="text-sm text-zinc-500 mt-1">Accept one-off payments from your customers using simple links.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 shadow-sm transition"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          Create link
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-5 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">
          <div className="col-span-1">Title</div>
          <div className="col-span-1">Amount</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Created</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-500 border-t-transparent mx-auto" />
          </div>
        ) : links.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">No checkout links found.</div>
        ) : (
          links.map((link) => (
            <div key={link.id} className="grid grid-cols-5 border-b border-zinc-100 px-4 py-3 text-sm hover:bg-zinc-50 transition items-center">
              <div className="col-span-1 font-medium text-zinc-900">{link.title}</div>
              <div className="col-span-1 font-semibold text-zinc-900">${link.amount.toFixed(2)}</div>
              <div className="col-span-1">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  link.status === "active" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-700"
                }`}>
                  {link.status}
                </span>
              </div>
              <div className="col-span-1 text-zinc-400">{new Date(link.createdAt).toLocaleDateString()}</div>
              <div className="col-span-1 text-right">
                <button 
                  onClick={() => copyToClipboard(link.id)}
                  className="text-zinc-500 hover:text-zinc-900 font-medium text-xs"
                >
                  Copy Link
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create New Checkout Link</h2>
            <form onSubmit={handleCreateLink} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Link Title</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. Consultation Session"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm outline-none focus:border-zinc-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Amount (USD)</label>
                <input 
                  required 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm outline-none focus:border-zinc-500" 
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
                  className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white hover:bg-zinc-800 shadow-sm"
                >
                  Create Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutContent />
    </Suspense>
  );
}
