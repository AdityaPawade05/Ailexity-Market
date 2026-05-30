"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState, useRef, useEffect } from "react";

export function Navbar() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const q = (form.elements.namedItem("search") as HTMLInputElement)?.value?.trim();
    if (q) {
      router.push(`/products?search=${encodeURIComponent(q)}`);
      setMobileSearchOpen(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await refresh();
    router.push("/");
  }

  function isActive(path: string) {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  }

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          {/* ─── Logo ─── */}
          <Link href="/" className="flex items-center gap-1.5 shrink-0 group">
            <span className="text-xl font-bold tracking-tight text-amber-600 transition-colors group-hover:text-amber-700">Ailexity</span>
            <span className="text-lg font-medium text-zinc-500 hidden sm:inline">Market</span>
          </Link>

          {/* ─── Search Bar (Desktop) ─── */}
          <form
            onSubmit={handleSearch}
            className="hidden sm:flex items-center flex-1 max-w-sm mx-6"
          >
            <div className={`relative w-full transition-all duration-200 ${searchFocused ? "scale-[1.02]" : ""}`}>
              <svg
                className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                  searchFocused ? "text-amber-500" : "text-zinc-400"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                name="search"
                type="search"
                placeholder="Search"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className={`w-full rounded-xl py-2 pl-9 pr-4 text-sm bg-zinc-100 placeholder-zinc-400 outline-none transition-all duration-200 ${
                  searchFocused
                    ? "bg-white ring-1 ring-zinc-300 shadow-sm placeholder-zinc-500"
                    : "hover:bg-zinc-200/70"
                }`}
              />
            </div>
          </form>

          {/* ─── Nav Icons (Right) ─── */}
          <div className="flex items-center gap-1">
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-zinc-200 animate-pulse" />
                <div className="h-6 w-6 rounded-full bg-zinc-200 animate-pulse" />
                <div className="h-8 w-8 rounded-full bg-zinc-200 animate-pulse" />
              </div>
            ) : user ? (
              <>
                {/* Mobile search toggle */}
                <button
                  onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                  className="sm:hidden p-2 rounded-xl text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                  aria-label="Search"
                >
                  <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                {/* Home */}
                <Link
                  href="/"
                  className={`p-2 rounded-xl transition-colors ${
                    isActive("/") && pathname === "/"
                      ? "text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                  title="Home"
                >
                  {isActive("/") && pathname === "/" ? (
                    <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.71 2.29a1 1 0 00-1.42 0l-9 9a1 1 0 000 1.42A1 1 0 003 13h1v7a2 2 0 002 2h4a1 1 0 001-1v-4h2v4a1 1 0 001 1h4a2 2 0 002-2v-7h1a1 1 0 00.71-1.71l-9-9z" />
                    </svg>
                  ) : (
                    <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  )}
                </Link>

                {/* Discover */}
                <Link
                  href="/products"
                  className={`p-2 rounded-xl transition-colors ${
                    isActive("/products")
                      ? "text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                  title="Discover"
                >
                  {isActive("/products") ? (
                    <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </Link>

                {/* Communities */}
                <Link
                  href="/communities"
                  className={`p-2 rounded-xl transition-colors ${
                    isActive("/communities")
                      ? "text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                  title="Communities"
                >
                  {isActive("/communities") ? (
                    <svg className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                    </svg>
                  ) : (
                    <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  )}
                </Link>

                {/* Create / Add new (for sellers) */}
                {(user.role === "seller" || user.role === "admin") && (
                  <Link
                    href="/dashboard/new"
                    className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                    title="Create"
                  >
                    <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </Link>
                )}

                {/* Admin shield */}
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    className={`p-2 rounded-xl transition-colors ${
                      isActive("/admin")
                        ? "text-rose-600"
                        : "text-zinc-500 hover:text-rose-600 hover:bg-rose-50"
                    }`}
                    title="Admin"
                  >
                    <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </Link>
                )}

                {/* Divider */}
                <div className="mx-1 h-6 w-px bg-zinc-200 hidden sm:block" />

                {/* Profile avatar + dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className={`p-[2px] rounded-full transition-all ${
                      dropdownOpen || isActive("/profile")
                        ? "ring-2 ring-zinc-900"
                        : "hover:ring-2 hover:ring-zinc-300"
                    }`}
                    aria-label="Profile menu"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} className="h-7 w-7 rounded-full object-cover" alt="" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs font-bold text-white">
                        {user.name?.charAt(0) || "U"}
                      </div>
                    )}
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute right-0 mt-3 w-60 rounded-2xl border border-zinc-200 bg-white py-2 shadow-xl shadow-zinc-200/40 z-50"
                      style={{ animation: "fadeIn 0.15s ease-out" }}
                    >
                      {/* User info header */}
                      <div className="px-4 py-3 border-b border-zinc-100">
                        <div className="flex items-center gap-3">
                          {user.avatar ? (
                            <img src={user.avatar} className="h-10 w-10 rounded-full object-cover" alt="" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-white">
                              {user.name?.charAt(0) || "U"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate">{user.name}</p>
                            <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                        >
                          <svg className="h-4.5 w-4.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                          Profile
                        </Link>

                        <Link
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                        >
                          <svg className="h-4.5 w-4.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                          </svg>
                          Dashboard
                        </Link>

                        <Link
                          href="/library"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                        >
                          <svg className="h-4.5 w-4.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                          </svg>
                          My Library
                        </Link>
                      </div>

                      <hr className="my-1 border-zinc-100" />

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            handleLogout();
                          }}
                          className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-zinc-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <svg className="h-4.5 w-4.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                          </svg>
                          Log out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ── Logged-out state ── */
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-amber-200/50 hover:shadow-amber-300/60 hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98]"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Mobile search overlay ─── */}
      {mobileSearchOpen && (
        <div
          className="sm:hidden fixed inset-x-0 top-14 z-40 bg-white border-b border-zinc-200 px-4 py-3 shadow-lg"
          style={{ animation: "fadeIn 0.12s ease-out" }}
        >
          <form onSubmit={handleSearch} className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              name="search"
              type="search"
              placeholder="Search"
              autoFocus
              className="w-full rounded-xl bg-zinc-100 py-2.5 pl-9 pr-4 text-sm placeholder-zinc-400 outline-none focus:bg-white focus:ring-1 focus:ring-zinc-300"
            />
          </form>
        </div>
      )}
    </>
  );
}
