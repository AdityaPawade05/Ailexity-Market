"use client";

import Link from "next/link";
import { ReactNode, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function NavLink({
  href,
  icon,
  pathname,
  contextQuery,
  children,
}: {
  href: string;
  icon: ReactNode;
  pathname: string;
  contextQuery: string;
  children: ReactNode;
}) {
  const isActive = pathname === href || (pathname.startsWith(href) && href !== '/dashboard' && href !== '/profile');

  // Preserve business context if present
  const finalHref = (contextQuery && !href.startsWith('/dashboard') && !href.startsWith('/profile'))
    ? `${href}${contextQuery}`
    : href;

  return (
    <Link
      href={finalHref}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 font-medium transition ${
        isActive
          ? "bg-amber-50 text-amber-900"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
    >
      <span className={isActive ? "text-amber-500" : "text-zinc-400"}>{icon}</span>
      {children}
    </Link>
  );
}

function BusinessLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const id = searchParams.get("id") || searchParams.get("productId");

  const contextQuery = type && id ? `?type=${type}&id=${id}` : "";
  const businessHomeHref = `/business/home${contextQuery}`;

  return (
    <div className="flex min-h-screen bg-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white px-4 py-6">
        <Link href={businessHomeHref} className="mb-6 flex items-center gap-3 rounded-lg bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm transition hover:shadow">
          <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          Business home
        </Link>
        
        <nav className="space-y-6 text-sm">
          {/* Dashboard Section */}
          <div>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Dashboard</h3>
            <div className="space-y-1">
              <NavLink href="/business/analytics" pathname={pathname} contextQuery={contextQuery} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>}>
                Analytics
              </NavLink>
              <NavLink href="/business/payments" pathname={pathname} contextQuery={contextQuery} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}>
                Payments
              </NavLink>
              <NavLink href="/business/users" pathname={pathname} contextQuery={contextQuery} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}>
                Users
              </NavLink>
              <NavLink href="/business/balances" pathname={pathname} contextQuery={contextQuery} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>}>
                Balances
              </NavLink>
            </div>
          </div>
          
          {/* Pinned Section */}
          <div>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Pinned</h3>
            <div className="space-y-1">
              <NavLink href="/dashboard" pathname={pathname} contextQuery={contextQuery} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}>
                Products
              </NavLink>
            </div>
          </div>
          
          {/* All Tools Section */}
          <div>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">All tools</h3>
            <div className="space-y-1">
              <NavLink href="/business/marketing" pathname={pathname} contextQuery={contextQuery} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}>
                Marketing
              </NavLink>
              <NavLink href="/profile" pathname={pathname} contextQuery={contextQuery} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}>
                Settings
              </NavLink>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-gradient-to-br from-amber-50/30 via-white to-orange-50/30">
        {children}
      </main>
    </div>
  );
}

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <BusinessLayoutContent>{children}</BusinessLayoutContent>
    </Suspense>
  );
}
