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
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-amber-50 via-white to-orange-50" />
        <section className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-24 text-center sm:py-32">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl md:text-6xl">
            Join the{" "}
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              community
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600">
            Log in to share posts, follow creators, discover ebooks & courses, and connect with buyers and sellers.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/login"
              className="rounded-xl bg-amber-500 px-8 py-4 font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-xl border-2 border-zinc-300 bg-white px-8 py-4 font-semibold text-zinc-700 transition hover:border-amber-400 hover:bg-amber-50"
            >
              Create account
            </Link>
          </div>
          <p className="mt-8 text-sm text-zinc-500">
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
