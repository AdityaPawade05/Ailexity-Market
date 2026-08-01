"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";

interface SubscriptionTier {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  features: string[];
}

interface Community {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  coverImageUrl: string;
  category: string;
  creator: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  tiers: SubscriptionTier[];
  _count: {
    members: number;
  };
}

export default function CommunityPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const communityId = params.id as string;

  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [userSubscription, setUserSubscription] = useState<any>(null);

  useEffect(() => {
    fetchCommunity();
    if (user) {
      checkUserSubscription();
    }
  }, [communityId, user]);

  async function fetchCommunity() {
    try {
      const res = await fetch(`/api/communities/${communityId}`);
      if (!res.ok) throw new Error("Failed to load community");
      const data = await res.json();
      setCommunity(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkUserSubscription() {
    try {
      const res = await fetch("/api/communities/subscriptions");
      if (!res.ok) return;
      const subscriptions = await res.json();
      const sub = subscriptions.find(
        (s: any) => s.communityId === communityId && s.status === "active"
      );
      setUserSubscription(sub);
    } catch (err) {
      console.error("Failed to check subscription:", err);
    }
  }

  async function handleSubscribe(tierId: string) {
    if (!user) {
      alert("Please log in to subscribe");
      return;
    }

    setSubscribing(tierId);
    try {
      const res = await fetch(`/api/communities/${communityId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to subscribe");
      }

      // Take the buyer straight into the connect/access flow (Connect Discord /
      // Telegram invite). The access page reflects their new active subscription.
      router.push(`/communities/${communityId}/access`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setSubscribing(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <p className="text-center">Loading community...</p>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <p className="text-center text-red-600">{error || "Community not found"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div
        className="h-64 bg-gradient-to-br from-blue-400 to-purple-500"
        style={{
          backgroundImage: community.coverImageUrl
            ? `url(${community.coverImageUrl})`
            : undefined,
          backgroundSize: "cover",
        }}
      />

      {/* Community Info */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10 pb-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-start gap-6 mb-6">
            <div
              className="w-32 h-32 rounded-lg bg-gray-300"
              style={{
                backgroundImage: community.avatarUrl
                  ? `url(${community.avatarUrl})`
                  : undefined,
                backgroundSize: "cover",
              }}
            />
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{community.name}</h1>
              <p className="text-gray-600 mb-4">{community.description}</p>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {community.category}
                </span>
                <span className="text-gray-600">
                  {community._count.members} members
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full bg-gray-300"
                  style={{
                    backgroundImage: community.creator.avatar
                      ? `url(${community.creator.avatar})`
                      : undefined,
                    backgroundSize: "cover",
                  }}
                />
                <div>
                  <p className="font-medium">{community.creator.name}</p>
                  <p className="text-sm text-gray-600">@{community.creator.username}</p>
                </div>
              </div>
            </div>
          </div>

          {userSubscription && (
            <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>
                ✓ You are subscribed to the {userSubscription.tier.name} tier
              </span>
              <button
                onClick={() => router.push(`/communities/${communityId}/access`)}
                className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 font-medium text-sm whitespace-nowrap"
              >
                Enter Community →
              </button>
            </div>
          )}
        </div>

        {/* Pricing Tiers */}
        {community.tiers.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6">Choose Your Membership</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {community.tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="bg-white rounded-lg shadow-lg p-8 flex flex-col"
                >
                  <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                  {tier.description && (
                    <p className="text-gray-600 text-sm mb-4">
                      {tier.description}
                    </p>
                  )}

                  <div className="mb-6">
                    {tier.price === 0 ? (
                      <div className="text-3xl font-bold">Free</div>
                    ) : (
                      <div>
                        <span className="text-3xl font-bold">
                          ${(tier.price / 100).toFixed(2)}
                        </span>
                        <span className="text-gray-600 ml-2">/{tier.interval}</span>
                      </div>
                    )}
                  </div>

                  {Array.isArray(tier.features) && tier.features.length > 0 && (
                    <div className="mb-6 flex-1">
                      <p className="font-medium mb-3">Features:</p>
                      <ul className="space-y-2">
                        {tier.features.map((feature, idx) => (
                          <li key={idx} className="text-sm text-gray-700">
                            ✓ {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {userSubscription?.tierId === tier.id ? (
                    <div className="space-y-2">
                      <p className="text-center text-sm font-medium text-green-700">
                        ✓ Current Tier
                      </p>
                      <button
                        onClick={() =>
                          router.push(`/communities/${communityId}/access`)
                        }
                        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        Enter Community
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(tier.id)}
                      disabled={subscribing === tier.id}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                    >
                      {subscribing === tier.id ? "Subscribing..." : "Subscribe"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
