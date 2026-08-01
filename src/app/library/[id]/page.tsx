"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type PurchaseData = {
  id: string;
  product: {
    title: string;
    description: string;
    type: string;
    imageUrl: string | null;
    fileUrl: string | null;
    audioUrl: string | null;
    seller: { name: string };
  };
  createdAt: string;
};

export default function LibraryViewerPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [purchase, setPurchase] = useState<PurchaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    
    if (user && params.id) {
      fetch(`/api/owned/${params.id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Purchase not found or unauthorized");
          return res.json();
        })
        .then(setPurchase)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, params.id, router]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-amber-500" />
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-xl font-semibold text-rose-600">Error loading content</h2>
        <p className="mt-2 text-zinc-600">{error || "The content could not be found."}</p>
        <Link href="/library" className="mt-6 inline-block rounded-lg bg-amber-500 px-6 py-2 font-medium text-white hover:bg-amber-600">
          Back to Library
        </Link>
      </div>
    );
  }

  const { product } = purchase;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/library" className="inline-flex items-center text-sm font-medium text-amber-600 hover:text-amber-700 mb-6">
        ← Back to Library
      </Link>
      
      <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
        {/* Main Content Area */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
            <div>
              <span className="capitalize text-xs font-bold text-amber-600 tracking-wider mb-1 block">
                {product.type}
              </span>
              <h1 className="text-3xl font-bold text-zinc-900 leading-tight">
                {product.title}
              </h1>
              <p className="text-zinc-500 mt-1">by {product.seller.name}</p>
            </div>
          </div>

          <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 shadow-sm bg-zinc-100">
            {product.fileUrl ? (
              (() => {
                const url = product.fileUrl;
                const isPdf =
                  url.startsWith("data:application/pdf") ||
                  url.split("?")[0].toLowerCase().endsWith(".pdf");
                if (isPdf) {
                  return (
                    <iframe
                      src={url}
                      className="w-full border-none"
                      style={{ height: "80vh", minHeight: 500 }}
                      title={product.title}
                    />
                  );
                }
                return (
                  <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-zinc-900">Content File Ready</h3>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
                    >
                      Open / Download File
                    </a>
                  </div>
                );
              })()
            ) : (
              <div className="flex items-center justify-center py-20 text-zinc-500">
                No content file has been provided for this product.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Audio Panel */}
        <div className="flex flex-col gap-6">
          {product.audioUrl && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 text-amber-700">
                  <svg className="h-5 w-5 ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-amber-900">Listen Available</h3>
                  <p className="text-xs text-amber-700">Audio narration version</p>
                </div>
              </div>
              <audio 
                controls 
                src={product.audioUrl} 
                className="w-full rounded-md"
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-zinc-900 mb-3">About this {product.type}</h3>
            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
            <div className="mt-6 border-t border-zinc-100 pt-4">
              <p className="text-xs text-zinc-400">
                Purchased on: {new Date(purchase.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Receipt ID: {purchase.id.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
