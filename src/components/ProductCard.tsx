"use client";

import Link from "next/link";
import Image from "next/image";

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  imageUrl: string | null;
  duration?: string | null;
  pages?: number | null;
  seller?: { name: string } | null;
  _count?: { purchases: number };
};

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-all hover:border-amber-200 hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const emoji = document.createElement("div");
                emoji.className = "flex h-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-4xl";
                emoji.textContent = product.type === "ebook" ? "📚" : "🎓";
                parent.appendChild(emoji);
              }
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-4xl">
            {product.type === "ebook" ? "📚" : "🎓"}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium capitalize text-zinc-700 backdrop-blur-sm">
          {product.type}
        </span>
        {product._count && product._count.purchases > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-rose-500/90 px-2 py-0.5 text-xs font-bold shadow-sm backdrop-blur-sm text-white">
            🔥 {product._count.purchases} Sold
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-zinc-900 line-clamp-1 group-hover:text-amber-600">
          {product.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{product.description}</p>
        {product.seller && (
          <p className="mt-2 text-xs text-zinc-400">by {product.seller.name}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-lg font-bold text-amber-600">${product.price.toFixed(2)}</span>
          {product.duration && (
            <span className="text-xs text-zinc-400">{product.duration}</span>
          )}
          {product.pages && (
            <span className="text-xs text-zinc-400">{product.pages} pages</span>
          )}
        </div>
      </div>
    </Link>
  );
}
