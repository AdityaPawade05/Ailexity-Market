"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type InviteInfo = {
  businessType: string;
  businessId: string;
  businessName: string | null;
  ownerName: string | null;
};

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invite not found");
          return;
        }
        setInvite(data);
      })
      .catch(() => setError("Something went wrong"))
      .finally(() => setLoading(false));
  }, [token]);

  async function acceptInvite() {
    setAccepting(true);
    setError("");
    try {
      const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to accept invite");
        return;
      }
      router.push(`/business/home?type=${data.businessType}&id=${data.businessId}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setAccepting(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      {error && !invite ? (
        <>
          <h1 className="text-xl font-bold text-zinc-900">Invite unavailable</h1>
          <p className="mt-2 text-sm text-zinc-600">{error}</p>
          <Link href="/" className="mt-6 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
            Go home
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold text-zinc-900">Team invite</h1>
          <p className="mt-2 text-sm text-zinc-600">
            {invite?.ownerName || "Someone"} invited you to join the team for{" "}
            <span className="font-semibold text-zinc-900">{invite?.businessName || "their business"}</span> on Ailexity Market.
          </p>

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

          {!user ? (
            <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
              You need to log in first.{" "}
              <Link href="/login" className="font-medium text-amber-600 hover:underline">
                Log in
              </Link>
              , then come back to this link to accept.
            </div>
          ) : (
            <button
              onClick={acceptInvite}
              disabled={accepting}
              className="mt-6 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {accepting ? "Joining..." : "Accept invite"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
