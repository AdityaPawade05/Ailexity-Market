"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { FeedPage } from "@/components/feed/FeedPage";
import { FeedLayout } from "@/components/feed/FeedLayout";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)]">
        <section className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-24 text-center sm:py-32">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-foreground before:mr-2 before:inline-block before:h-2 before:w-2 before:bg-accent before:content-['']">
            Ailexity Market
          </span>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Join the{" "}
            <span className="bg-accent-2 px-2 whitespace-nowrap">community</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Log in to share posts, follow creators, discover ebooks &amp; courses, and connect with buyers and sellers.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/login"
              className="btn-structural rounded-sm border-2 border-foreground bg-accent px-8 py-4 font-bold text-background shadow-hard-sm"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="btn-structural rounded-sm border-2 border-foreground bg-background px-8 py-4 font-bold text-foreground shadow-hard-sm"
            >
              Create account
            </Link>
          </div>
          <p className="mt-8 text-sm text-muted">
            Your data stays with us. Only registered users can post, follow, and interact.
          </p>
        </section>
      </div>
    );
  }

  return (
    <FeedLayout>
      <FeedPage />
    </FeedLayout>
  );
}
