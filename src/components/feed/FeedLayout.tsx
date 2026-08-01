"use client";

import Link from "next/link";

export function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
      {/* Left Sidebar */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <nav className="sticky top-24 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 font-medium text-amber-800"
          >
            <span className="text-xl">🏠</span>
            Home
          </Link>
          <Link
            href="/products"
            className="flex items-center gap-3 rounded-lg px-4 py-3 font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span className="text-xl">🔍</span>
            Discover
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-4 py-3 font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span className="text-xl">📦</span>
            My Products
          </Link>
          <Link
            href="/dashboard/new"
            className="flex items-center gap-3 rounded-lg px-4 py-3 font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span className="text-xl">🚀</span>
            Start a Business / Product
          </Link>
          <Link
            href="/channel/new"
            className="flex items-center gap-3 rounded-lg px-4 py-3 font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span className="text-xl">🌐</span>
            Create Community
          </Link>
          <Link
            href="/library"
            className="flex items-center gap-3 rounded-lg px-4 py-3 font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span className="text-xl">📚</span>
            My Library
          </Link>
          <Link
            href="/dashboard/new"
            className="mt-4 flex items-center gap-3 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 px-4 py-3 font-medium text-amber-800 hover:bg-amber-100"
          >
            <span className="text-xl">+</span>
            Create Product
          </Link>
          <div className="mt-6 border-t border-zinc-200 pt-4">
            <p className="px-4 text-xs font-medium uppercase tracking-wider text-zinc-400">
              Resources
            </p>
            <Link
              href="/products?type=ebook"
              className="mt-2 flex items-center gap-3 rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
            >
              Ebooks
            </Link>
            <Link
              href="/products?type=course"
              className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
            >
              Courses
            </Link>
          </div>
        </nav>
      </aside>

      {/* Center - Feed */}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
