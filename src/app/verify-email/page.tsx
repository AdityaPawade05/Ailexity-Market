"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) return;

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          setTimeout(() => router.push("/products"), 2500);
        } else if (data.alreadyVerified) {
          setStatus("already");
        } else {
          setStatus("error");
          setErrorMsg(data.error || "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Something went wrong. Please try again.");
      });
  }, [token, router]);

  // A missing token is known at render time — no state update needed.
  const displayStatus = token ? status : "error";
  const displayError = token ? errorMsg : "No verification token provided.";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg text-center">
        {displayStatus === "loading" && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            <h1 className="text-xl font-bold text-zinc-900">Verifying your email…</h1>
          </>
        )}

        {displayStatus === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
              ✓
            </div>
            <h1 className="text-xl font-bold text-zinc-900">Email verified!</h1>
            <p className="mt-2 text-zinc-500">You&apos;re now logged in. Redirecting to the marketplace…</p>
          </>
        )}

        {displayStatus === "already" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-3xl">
              ✓
            </div>
            <h1 className="text-xl font-bold text-zinc-900">Already verified</h1>
            <p className="mt-2 text-zinc-500">Your email is already verified.</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-white hover:bg-amber-600"
            >
              Log in
            </Link>
          </>
        )}

        {displayStatus === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-3xl">
              ✗
            </div>
            <h1 className="text-xl font-bold text-zinc-900">Verification failed</h1>
            <p className="mt-2 text-zinc-500">{displayError}</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-white hover:bg-amber-600"
            >
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
