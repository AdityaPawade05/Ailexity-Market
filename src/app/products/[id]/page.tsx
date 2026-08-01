"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { StarRating } from "@/components/StarRating";

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  imageUrl: string | null;
  fileUrl: string | null;
  duration?: string | null;
  pages?: number | null;
  published: boolean;
  seller?: { id: string; name: string } | null;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
};

function ProductContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, walletBalance, refreshWallet, refreshCart, refreshWishlist } = useAuth();

  const refId = searchParams.get("ref");
  const affCode = searchParams.get("aff");
  const [origin, setOrigin] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [inCart, setInCart] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [couponStatus, setCouponStatus] = useState<"idle" | "checking" | "applied" | "invalid">(
    "idle"
  );
  const [couponError, setCouponError] = useState("");
  const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then((res) => {
        setOrigin(window.location.origin);
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  // One-shot click beacon for a shared affiliate link — best-effort, never
  // blocks rendering or the purchase flow.
  useEffect(() => {
    if (!affCode) return;
    fetch("/api/marketing/affiliate-links/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: affCode }),
    }).catch(() => {});
  }, [affCode]);

  useEffect(() => {
    if (!user || !product) return;
    fetch("/api/cart")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.items)) {
          setInCart(data.items.some((i: { productId: string }) => i.productId === product.id));
        }
      })
      .catch(() => {});
    fetch("/api/wishlist")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.items)) {
          setInWishlist(data.items.some((i: { productId: string }) => i.productId === product.id));
        }
      })
      .catch(() => {});
  }, [user, product]);

  async function handleToggleWishlist() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!product) return;
    setTogglingWishlist(true);
    try {
      if (inWishlist) {
        await fetch(`/api/wishlist/${product.id}`, { method: "DELETE" });
        setInWishlist(false);
      } else {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        });
        if (res.ok) setInWishlist(true);
      }
      await refreshWishlist();
    } finally {
      setTogglingWishlist(false);
    }
  }

  async function handleAddToCart() {
    if (!user) {
      router.push("/login");
      return;
    }
    setError("");
    setAddingToCart(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product?.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add to cart");
        return;
      }
      setInCart(true);
      await refreshCart();
    } catch {
      setError("Something went wrong");
    } finally {
      setAddingToCart(false);
    }
  }

  async function loadReviews() {
    if (!product) return;
    const res = await fetch(`/api/products/${product.id}/reviews`);
    const data = await res.json();
    if (res.ok) {
      setReviews(data.reviews || []);
      setAvgRating(data.average);
      setReviewCount(data.count || 0);
    }
  }

  useEffect(() => {
    if (product) loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const myReview = user ? reviews.find((r) => r.user.id === user.id) : undefined;

  useEffect(() => {
    if (myReview) {
      setReviewForm({ rating: myReview.rating, comment: myReview.comment || "" });
    }
  }, [myReview]);

  async function handleSubmitReview() {
    if (!product) return;
    setReviewError("");
    setSubmittingReview(true);
    try {
      const res = myReview
        ? await fetch(`/api/reviews/${myReview.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reviewForm),
          })
        : await fetch(`/api/products/${product.id}/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reviewForm),
          });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || "Failed to save review");
        return;
      }
      setShowReviewForm(false);
      await loadReviews();
    } catch {
      setReviewError("Something went wrong");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleDeleteReview() {
    if (!myReview) return;
    if (!confirm("Delete your review?")) return;
    await fetch(`/api/reviews/${myReview.id}`, { method: "DELETE" });
    await loadReviews();
  }

  async function handleApplyCoupon() {
    if (!couponInput.trim() || !product) return;
    setCouponStatus("checking");
    setCouponError("");
    try {
      const res = await fetch("/api/marketing/discount-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, code: couponInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponStatus("invalid");
        setCouponError(data.error || "Invalid code");
        setDiscountedPrice(null);
        return;
      }
      setCouponStatus("applied");
      setDiscountedPrice(data.discountedPrice);
    } catch {
      setCouponStatus("invalid");
      setCouponError("Something went wrong");
      setDiscountedPrice(null);
    }
  }

  async function handlePurchaseClick() {
    if (!user) {
      router.push("/login");
      return;
    }
    setError("");
    setPurchasing(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product?.id,
          paymentMethod: "free",
          referredBy: refId,
          discountCode: couponStatus === "applied" ? couponInput.trim() : undefined,
          affiliateCode: affCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Purchase failed");
        setPurchasing(false);
        return;
      }
      await refreshWallet();
      router.push("/library");
    } catch {
      setError("Something went wrong");
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="h-96 animate-pulse rounded-2xl bg-zinc-200" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-zinc-900">Product not found</h2>
        <Link href="/products" className="mt-4 inline-block text-amber-600 hover:text-amber-700">
          Back to marketplace
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === product.seller?.id;
  const isAdmin = user?.role === "admin";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="lg:w-1/2">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-zinc-100">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-6xl">
                {product.type === "ebook" ? "📚" : "🎓"}
              </div>
            )}
          </div>
        </div>
        <div className="lg:w-1/2">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
            {product.type}
          </span>
          <h1 className="mt-4 text-3xl font-bold text-zinc-900">{product.title}</h1>
          {product.seller && (
            <p className="mt-2 text-zinc-600">by {product.seller.name}</p>
          )}
          {reviewCount > 0 && avgRating !== null && (
            <a href="#reviews" className="mt-2 flex items-center gap-2">
              <StarRating value={avgRating} size={16} />
              <span className="text-sm text-zinc-500">
                {avgRating.toFixed(1)} · {reviewCount} review{reviewCount === 1 ? "" : "s"}
              </span>
            </a>
          )}
          <div className="mt-4 flex gap-4 text-sm text-zinc-500">
            {product.duration && <span>⏱ {product.duration}</span>}
            {product.pages && <span>📄 {product.pages} pages</span>}
          </div>
          <p className="mt-6 text-zinc-600">{product.description}</p>
          <div className="mt-8 flex items-center gap-4">
            {discountedPrice !== null ? (
              <>
                <span className="text-3xl font-bold text-amber-600">
                  ${discountedPrice.toFixed(2)}
                </span>
                <span className="text-lg text-zinc-400 line-through">
                  ${product.price.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold text-amber-600">
                ${product.price.toFixed(2)}
              </span>
            )}
            {!product.published && (
              <span className="rounded bg-zinc-200 px-2 py-1 text-xs text-zinc-600">
                Draft
              </span>
            )}
          </div>

          {user && product.published && !isOwner && !isAdmin && (
            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => {
                  setCouponInput(e.target.value);
                  setCouponStatus("idle");
                  setDiscountedPrice(null);
                }}
                placeholder="Discount code"
                className="w-40 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponStatus === "checking" || !couponInput.trim()}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {couponStatus === "checking" ? "Checking..." : "Apply"}
              </button>
              {couponStatus === "applied" && (
                <span className="text-sm text-emerald-600">Applied!</span>
              )}
              {couponStatus === "invalid" && (
                <span className="text-sm text-rose-600">{couponError}</span>
              )}
            </div>
          )}

          {user && product.published && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">🎁 Share & Earn!</p>
              <p className="mt-1 text-xs text-amber-700">Recommend this {product.type} to others using your unique link below. For every 10 people who purchase from your link, you earn a free book!</p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${origin}/products/${product.id}?ref=${user.id}`}
                  className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-zinc-600 outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${origin}/products/${product.id}?ref=${user.id}`);
                    alert("Link copied!");
                  }}
                  className="rounded-lg bg-amber-200 px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-300 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          )}

          {!isOwner && !isAdmin && user && product.published && walletBalance !== null && walletBalance < (discountedPrice ?? product.price) && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              ⚠️ Your wallet balance (${walletBalance.toFixed(2)}) is below the price of this item.{" "}
              <Link href="/business/balances" className="font-semibold underline hover:text-amber-900">
                Top up your wallet
              </Link>{" "}
              to complete this purchase.
            </div>
          )}

          {(isOwner || isAdmin) ? (
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-lg bg-zinc-200 px-6 py-3 font-medium text-zinc-700 hover:bg-zinc-300"
            >
              Manage in Dashboard
            </Link>
          ) : product.published ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={handlePurchaseClick}
                disabled={purchasing}
                className="rounded-lg bg-amber-500 py-4 px-8 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                {purchasing ? "Processing..." : "Buy Now"}
              </button>
              {inCart ? (
                <Link
                  href="/cart"
                  className="rounded-lg border border-amber-300 bg-amber-50 py-4 px-8 font-semibold text-amber-700 transition hover:bg-amber-100"
                >
                  In Cart — View Cart
                </Link>
              ) : (
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="rounded-lg border border-zinc-300 bg-white py-4 px-8 font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  {addingToCart ? "Adding..." : "Add to Cart"}
                </button>
              )}
              <button
                onClick={handleToggleWishlist}
                disabled={togglingWishlist}
                title={inWishlist ? "Remove from saved" : "Save for later"}
                className="flex items-center justify-center rounded-lg border border-zinc-300 bg-white p-4 text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                <svg
                  className={`h-5 w-5 ${inWishlist ? "text-rose-500" : ""}`}
                  viewBox="0 0 24 24"
                  fill={inWishlist ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 10-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Reviews */}
      <div id="reviews" className="mt-16 border-t border-zinc-200 pt-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-zinc-900">
            Reviews {reviewCount > 0 && <span className="text-zinc-400 font-normal">({reviewCount})</span>}
          </h2>
          {avgRating !== null && (
            <div className="flex items-center gap-2">
              <StarRating value={avgRating} size={18} />
              <span className="font-semibold text-zinc-900">{avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {user && !isOwner && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
            {!showReviewForm && !myReview && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Write a review
              </button>
            )}

            {myReview && !showReviewForm && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-600">You reviewed this product.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowReviewForm(true)} className="text-sm font-medium text-amber-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={handleDeleteReview} className="text-sm font-medium text-rose-600 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            )}

            {showReviewForm && (
              <div>
                <p className="text-sm font-medium text-zinc-700 mb-2">Your rating</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setReviewForm((f) => ({ ...f, rating: n }))}
                      className="p-0.5"
                      aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    >
                      <svg width={24} height={24} viewBox="0 0 20 20" fill={n <= reviewForm.rating ? "#f59e0b" : "#e4e4e7"}>
                        <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.8L10 14.77l-5.21 2.75 1-5.8-4.21-4.1 5.82-.85L10 1.5z" />
                      </svg>
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                  placeholder="Share your thoughts about this product (optional)"
                  rows={3}
                  className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
                {reviewError && <p className="mt-2 text-sm text-rose-600">{reviewError}</p>}
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    {submittingReview ? "Saving..." : myReview ? "Update review" : "Submit review"}
                  </button>
                  <button
                    onClick={() => setShowReviewForm(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {reviews.length === 0 ? (
            <p className="text-sm text-zinc-500">No reviews yet.</p>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white">
                    {r.user.avatar ? (
                      <img src={r.user.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      r.user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900">{r.user.name}</p>
                    <div className="flex items-center gap-2">
                      <StarRating value={r.rating} size={13} />
                      <span className="text-xs text-zinc-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {r.comment && <p className="mt-3 text-sm text-zinc-600">{r.comment}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <ProductContent />
    </Suspense>
  );
}
