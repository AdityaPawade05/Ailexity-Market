"use client";

import { usePathname } from "next/navigation";
import { AIChatWidget } from "@/components/AIChatWidget";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDesignSample = pathname === "/design-sample";

  return (
    <Providers>
      {!isDesignSample && <Navbar />}
      <main className={isDesignSample ? "flex-1" : "flex-1"}>{children}</main>
      {!isDesignSample && <AIChatWidget />}
      {!isDesignSample && (
        <footer className="border-t-2 border-foreground bg-background py-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 text-xs font-mono text-muted">
            <span>&copy; {new Date().getFullYear()} Ailexity Market</span>
            <nav className="flex gap-4">
              <a href="/privacy" className="transition-colors hover:text-accent">Privacy</a>
              <a href="/terms" className="transition-colors hover:text-accent">Terms</a>
              <a href="mailto:support@ailexity.market" className="transition-colors hover:text-accent">Support</a>
            </nav>
          </div>
        </footer>
      )}
    </Providers>
  );
}
