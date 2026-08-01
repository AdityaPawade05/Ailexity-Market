"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      setRegisteredEmail(data.email || email);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    setResendMsg("");
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });
      setResendMsg("Verification email resent! Check your inbox.");
    } catch {
      setResendMsg("Failed to resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  if (registeredEmail) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-3xl">
            ✉
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Check your email</h1>
          <p className="mt-3 text-zinc-600">
            We sent a verification link to{" "}
            <span className="font-medium text-zinc-900">{registeredEmail}</span>.
            Click it to activate your account.
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
          </p>

          {resendMsg && (
            <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {resendMsg}
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={resendLoading}
            className="mt-6 w-full rounded-lg border border-zinc-300 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {resendLoading ? "Sending…" : "Resend verification email"}
          </button>

          <p className="mt-4 text-sm text-zinc-500">
            Wrong email?{" "}
            <button
              onClick={() => setRegisteredEmail("")}
              className="font-medium text-amber-600 hover:text-amber-700"
            >
              Go back
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-zinc-900">Create your account</h1>
          <p className="mt-2 text-zinc-600">Join Ailexity Market as a buyer or creator</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
            )}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              <p className="mt-1 text-xs text-zinc-500">At least 6 characters</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              All accounts have buy/sell access by default, plus community tools.
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-amber-500 py-3 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs font-medium uppercase text-zinc-400">or</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <a
            href="/api/auth/google"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 py-3 font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </a>

          <p className="mt-6 text-center text-sm text-zinc-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-amber-600 hover:text-amber-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
