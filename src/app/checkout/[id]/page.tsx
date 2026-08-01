"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type CheckoutLink = {
  id: string;
  title: string;
  amount: number;
  status: string;
  seller: { id: string; name: string; avatar: string | null } | null;
  product: { id: string; title: string; type: string; imageUrl: string | null } | null;
};

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, walletBalance, refreshWallet } = useAuth();

  const [link, setLink] = useState<CheckoutLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/checkout/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setLink)
      .catch(() => setLink(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handlePay() {
    if (!user) {
      router.push("/login");
      return;
    }
    setError("");
    setPaying(true);
    try {
      const res = await fetch(`/api/checkout/${params.id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Payment failed");
        return;
      }
      await refreshWallet();
      setPaid(true);
    } catch {
      setError("Something went wrong");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="h-72 animate-pulse rounded-2xl bg-zinc-200" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-3xl">
            ✗
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Checkout link not found</h1>
          <p className="mt-2 text-sm text-zinc-500">
            This link may have been removed or never existed.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-block rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-white hover:bg-amber-600"
          >
            Browse marketplace
          </Link>
        </div>
      </div>
    );
  }

  const inactive = link.status !== "active";
  const isOwnLink = user?.id === link.seller?.id;
  const insufficient =
    user !== null && walletBalance !== null && walletBalance < link.amount;

  if (paid) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
            ✓
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Payment successful!</h1>
          <p className="mt-2 text-zinc-600">
            You paid <span className="font-semibold">${link.amount.toFixed(2)}</span> for{" "}
            <span className="font-semibold">{link.title}</span>.
          </p>
          {link.product ? (
            <Link
              href="/library"
              className="mt-6 inline-block rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-white hover:bg-amber-600"
            >
              View in Library
            </Link>
          ) : (
            <Link
              href="/products"
              className="mt-6 inline-block rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-white hover:bg-amber-600"
            >
              Browse marketplace
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg">
        {/* Product image, if the link sells one */}
        {link.product && (
          <div className="relative aspect-video bg-zinc-100">
            {link.product.imageUrl ? (
              <img
                src={link.product.imageUrl}
                alt={link.product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-5xl">
                {link.product.type === "ebook" ? "📚" : "🎓"}
              </div>
            )}
          </div>
        )}

        <div className="p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            Checkout
          </p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">{link.title}</h1>

          {link.seller && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-amber-100">
                {link.seller.avatar ? (
                  <img src={link.seller.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-amber-800">
                    {link.seller.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm text-zinc-600">Sold by {link.seller.name}</span>
            </div>
          )}

          {link.product && (
            <p className="mt-3 text-sm text-zinc-500">
              Includes access to <span className="font-medium text-zinc-700">{link.product.title}</span> in your library.
            </p>
          )}

          <div className="mt-6 flex items-baseline justify-between border-t border-zinc-100 pt-5">
            <span className="text-sm font-medium text-zinc-500">Total</span>
            <span className="text-3xl font-bold text-amber-600">${link.amount.toFixed(2)}</span>
          </div>

          {user && walletBalance !== null && (
            <p className="mt-2 text-right text-xs text-zinc-400">
              Wallet balance: ${walletBalance.toFixed(2)}
            </p>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          )}

          {inactive ? (
            <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center text-sm font-medium text-zinc-500">
              This checkout link is no longer active.
            </div>
          ) : isOwnLink ? (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800">
              This is your checkout link — share it with customers to get paid.
            </div>
          ) : (
            <>
              {insufficient && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  ⚠️ Your wallet balance is below the total.{" "}
                  <Link
                    href="/business/balances"
                    className="font-semibold underline hover:text-amber-900"
                  >
                    Top up your wallet
                  </Link>{" "}
                  to complete this payment.
                </div>
              )}
              <button
                onClick={handlePay}
                disabled={paying || authLoading}
                className="mt-6 w-full rounded-lg bg-amber-500 py-3.5 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                {paying
                  ? "Processing..."
                  : user
                    ? `Pay $${link.amount.toFixed(2)}`
                    : "Log in to pay"}
              </button>
            </>
          )}

          <p className="mt-4 text-center text-[11px] text-zinc-400">
            Payments are made from your Ailexity Market wallet.
          </p>
        </div>
      </div>
    </div>
  );
}
