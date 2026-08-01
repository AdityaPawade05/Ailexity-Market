"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StarRating } from "./StarRating";
import { useAuth } from "@/context/AuthContext";

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  imageUrl: string | null;
  duration?: string | null;
  pages?: number | null;
  seller?: { id?: string; name: string } | null;
  _count?: { purchases: number };
  avgRating?: number | null;
  reviewCount?: number;
  isSaved?: boolean;
};

export function ProductCard({ product }: { product: Product }) {
  const { user, refreshWishlist } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(!!product.isSaved);
  const [saving, setSaving] = useState(false);
  const isOwner = !!user && !!product.seller?.id && user.id === product.seller.id;

  async function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push("/login");
      return;
    }
    setSaving(true);
    try {
      if (saved) {
        await fetch(`/api/wishlist/${product.id}`, { method: "DELETE" });
        setSaved(false);
      } else {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        });
        if (res.ok) setSaved(true);
      }
      await refreshWishlist();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Link
      href={`/products/${product.id}`}
      className="card-structural group flex flex-col overflow-hidden rounded-sm border-2 border-foreground bg-background shadow-hard-sm"
    >
      <div className="relative aspect-video w-full overflow-hidden border-b-2 border-foreground bg-accent-2/15">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const emoji = document.createElement("div");
                emoji.className = "flex h-full items-center justify-center bg-accent-2/20 text-4xl";
                emoji.textContent = product.type === "ebook" ? "📚" : "🎓";
                parent.appendChild(emoji);
              }
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-accent-2/20 text-4xl">
            {product.type === "ebook" ? "📚" : "🎓"}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-sm border border-foreground bg-background px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-foreground">
          {product.type}
        </span>
        {!isOwner && (
          <button
            onClick={toggleSave}
            disabled={saving}
            title={saved ? "Remove from saved" : "Save for later"}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-sm border-2 border-foreground bg-background transition-colors hover:bg-accent-2/30 disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${saved ? "text-accent" : "text-muted"}`}
              viewBox="0 0 24 24"
              fill={saved ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 10-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        )}
        {product._count && product._count.purchases > 0 && (
          <span className={`absolute right-2 ${isOwner ? "top-2" : "top-11"} rounded-sm border border-foreground bg-foreground px-2 py-0.5 text-xs font-bold text-background`}>
            🔥 {product._count.purchases} Sold
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-bold text-foreground line-clamp-1 group-hover:text-accent">
          {product.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{product.description}</p>
        {product.seller && (
          <p className="mt-2 text-xs text-muted">by {product.seller.name}</p>
        )}
        {!!product.reviewCount && product.avgRating != null && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <StarRating value={product.avgRating} size={12} />
            <span className="text-xs text-muted font-mono tabular-nums">
              {product.avgRating.toFixed(1)} ({product.reviewCount})
            </span>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between border-t-2 border-foreground pt-3 mt-3">
          <span className="font-mono text-lg font-bold text-foreground tabular-nums">${product.price.toFixed(2)}</span>
          {product.duration && (
            <span className="text-xs text-muted font-mono">{product.duration}</span>
          )}
          {product.pages && (
            <span className="text-xs text-muted font-mono">{product.pages} pages</span>
          )}
        </div>
      </div>
    </Link>
  );
}
