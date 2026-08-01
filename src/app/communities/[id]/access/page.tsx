"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import TelegramLoginButton from "@/components/TelegramLoginButton";

interface AccessStatus {
  community: { id: string; name: string };
  subscription: { status: string; active: boolean; tierName: string | null } | null;
  discord: { configured: boolean; linked: boolean; serverId: string | null };
  telegram: { configured: boolean; linked: boolean; inviteLink: string | null };
}

function AccessContent() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const communityId = params.id as string;

  const [status, setStatus] = useState<AccessStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Banner driven by the OAuth callback redirect (?discord=connected|error).
  const discordResult = searchParams.get("discord");
  // Banner driven by the Telegram Login Widget callback (?telegram=connected|error).
  const telegramResult = searchParams.get("telegram");
  const errorReason = searchParams.get("reason");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user) {
      fetchStatus();
    }
  }, [authLoading, user, communityId, router]);

  async function fetchStatus() {
    try {
      const res = await fetch(`/api/communities/${communityId}/access`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load access status");
      setStatus(await res.json());
    } catch (err) {
      console.error("Access status error:", err);
    } finally {
      setLoading(false);
    }
  }

  function connectDiscord() {
    const returnTo = `/communities/${communityId}/access`;
    window.location.href = `/api/integrations/discord/connect?returnTo=${encodeURIComponent(
      returnTo
    )}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">Couldn&apos;t load access status.</p>
      </div>
    );
  }

  const isActive = status.subscription?.active;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-2">{status.community.name}</h1>
        <p className="text-gray-600 mb-8">Manage your community access</p>

        {discordResult === "connected" && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-300 text-green-800">
            ✅ Discord connected successfully!
          </div>
        )}
        {discordResult === "error" && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-300 text-red-800">
            ❌ Discord connection failed{errorReason ? `: ${errorReason}` : ""}. Please try again.
          </div>
        )}
        {telegramResult === "connected" && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-300 text-green-800">
            ✅ Telegram connected successfully!
          </div>
        )}
        {telegramResult === "error" && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-300 text-red-800">
            ❌ Telegram connection failed{errorReason ? `: ${errorReason}` : ""}. Please try again.
          </div>
        )}

        {/* Subscription status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-lg mb-3">Subscription</h2>
          {isActive ? (
            <p className="text-green-700">
              Active{status.subscription?.tierName ? ` · ${status.subscription.tierName}` : ""}
            </p>
          ) : (
            <div>
              <p className="text-gray-600 mb-3">
                You don&apos;t have an active subscription to this community.
              </p>
              <button
                onClick={() => router.push(`/communities/${communityId}`)}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                View Tiers
              </button>
            </div>
          )}
        </div>

        {/* In-app community room */}
        {isActive && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">💬</span>
              <h2 className="font-semibold text-lg">Community Room</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Chat with other members right here on Ailexity — no external app needed.
            </p>
            <button
              onClick={() => router.push(`/communities/${communityId}/room`)}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Enter Room
            </button>
          </div>
        )}

        {/* Discord access */}
        {isActive && status.discord.configured && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🤖</span>
              <h2 className="font-semibold text-lg">Discord</h2>
            </div>
            {status.discord.linked ? (
              <div>
                <p className="text-green-700 mb-4">You&apos;re in! 🎉</p>
                <a
                  href={
                    status.discord.serverId
                      ? `https://discord.com/channels/${status.discord.serverId}`
                      : "https://discord.com/app"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-5 py-2 bg-[#5865F2] text-white rounded-lg hover:opacity-90 font-medium"
                >
                  Open Discord
                </a>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  Connect your Discord account to get your role and access private channels.
                </p>
                <button
                  onClick={connectDiscord}
                  className="px-5 py-2 bg-[#5865F2] text-white rounded-lg hover:opacity-90 font-medium"
                >
                  Connect Discord
                </button>
              </div>
            )}
          </div>
        )}

        {/* Telegram access */}
        {isActive && status.telegram.configured && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">💬</span>
              <h2 className="font-semibold text-lg">Telegram</h2>
            </div>
            {status.telegram.inviteLink ? (
              <div>
                <p className="text-gray-600 mb-4">
                  Use your personal invite link to join the private group (expires in 48h).
                </p>
                <a
                  href={status.telegram.inviteLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-5 py-2 bg-[#229ED9] text-white rounded-lg hover:opacity-90 font-medium"
                >
                  Join Telegram Group
                </a>
              </div>
            ) : (
              <p className="text-gray-500">
                Invite link unavailable right now. Refresh to try again.
              </p>
            )}
            {!status.telegram.linked && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-gray-500 text-sm mb-3">
                  Link your Telegram account so access is removed automatically if you cancel.
                </p>
                <TelegramLoginButton returnTo={`/communities/${communityId}/access`} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommunityAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">Loading…</p>
        </div>
      }
    >
      <AccessContent />
    </Suspense>
  );
}
