"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function IntegrationsPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const communityId = params.id as string;
  const setupType = searchParams.get("setup") as "discord" | "telegram" | null;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"discord" | "telegram">(
    setupType || "discord"
  );
  const [discordConfig, setDiscordConfig] = useState<any>(null);
  const [telegramConfig, setTelegramConfig] = useState<any>(null);

  const [discordForm, setDiscordForm] = useState({
    serverId: "",
    botToken: "",
    managedRoleId: "",
    managedChannelId: "",
  });

  const [telegramForm, setTelegramForm] = useState({
    groupId: "",
    botToken: "",
    managedChannelId: "",
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }
    if (!authLoading && user) {
      fetchConfigs();
    }
  }, [authLoading, user, communityId, router]);

  async function fetchConfigs() {
    try {
      setLoading(true);
      const [discordRes, telegramRes] = await Promise.all([
        fetch(`/api/communities/${communityId}/integrations/discord`),
        fetch(`/api/communities/${communityId}/integrations/telegram`),
      ]);

      if (discordRes.ok) {
        const data = await discordRes.json();
        setDiscordConfig(data.integration);
        if (data.integration) {
          setDiscordForm({
            serverId: data.integration.serverId,
            botToken: "",
            managedRoleId: data.integration.managedRoleId || "",
            managedChannelId: data.integration.managedChannelId || "",
          });
        }
      }

      if (telegramRes.ok) {
        const data = await telegramRes.json();
        setTelegramConfig(data.integration);
        if (data.integration) {
          setTelegramForm({
            groupId: data.integration.groupId,
            botToken: "",
            managedChannelId: data.integration.managedChannelId || "",
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch configs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDiscordSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");

    try {
      if (!discordForm.serverId || !discordForm.botToken) {
        alert("Server ID and Bot Token are required");
        return;
      }

      const res = await fetch(
        `/api/communities/${communityId}/integrations/discord`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordForm),
        }
      );

      if (!res.ok) throw new Error("Failed to save Discord config");
      setSuccessMsg("✅ Discord integration saved! Members will auto-join on subscribe.");
      fetchConfigs();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleTelegramSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");

    try {
      if (!telegramForm.groupId || !telegramForm.botToken) {
        alert("Group ID and Bot Token are required");
        return;
      }

      const res = await fetch(
        `/api/communities/${communityId}/integrations/telegram`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(telegramForm),
        }
      );

      if (!res.ok) throw new Error("Failed to save Telegram config");
      setSuccessMsg("✅ Telegram integration saved! Invite links will be auto-sent.");
      fetchConfigs();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(type: "discord" | "telegram") {
    if (!confirm(`Remove ${type} integration?`)) return;

    try {
      const res = await fetch(
        `/api/communities/${communityId}/integrations/${type}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Failed to remove");
      alert(`${type} integration removed!`);
      fetchConfigs();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <h1 className="text-3xl font-bold">Connect Your Community</h1>
            <p className="mt-2 opacity-90">
              Auto-add members to Discord or Telegram when they subscribe
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab("discord")}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === "discord"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              🤖 Discord {discordConfig && "✓"}
            </button>
            <button
              onClick={() => setActiveTab("telegram")}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === "telegram"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              💬 Telegram {telegramConfig && "✓"}
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            {successMsg && (
              <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg border border-green-300">
                {successMsg}
              </div>
            )}

            {/* Discord Tab */}
            {activeTab === "discord" && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="font-bold text-blue-900 mb-4">📋 Setup Guide</h3>
                  <ol className="space-y-3 text-sm text-blue-800">
                    <li>
                      <strong>1. Create Bot:</strong>{" "}
                      <a
                        href="https://discord.com/developers/applications"
                        target="_blank"
                        rel="noopener"
                        className="text-blue-600 underline"
                      >
                        Go here
                      </a>
                      , click "New Application", then add a Bot
                    </li>
                    <li>
                      <strong>2. Copy Token:</strong> Under Bot section, copy the TOKEN
                    </li>
                    <li>
                      <strong>3. Set Permissions:</strong> Check "Manage Roles" & "Manage Channels"
                    </li>
                    <li>
                      <strong>4. Add to Server:</strong> Copy the invite URL and add bot to your server
                    </li>
                    <li>
                      <strong>5. Get IDs:</strong> Right-click your server/role/channel and copy IDs
                    </li>
                  </ol>
                </div>

                <form onSubmit={handleDiscordSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discord Server ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={discordForm.serverId}
                      onChange={(e) =>
                        setDiscordForm({
                          ...discordForm,
                          serverId: e.target.value,
                        })
                      }
                      placeholder="e.g., 1234567890"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Right-click your Discord server → Copy Server ID
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bot Token *
                    </label>
                    <input
                      type="password"
                      required
                      value={discordForm.botToken}
                      onChange={(e) =>
                        setDiscordForm({
                          ...discordForm,
                          botToken: e.target.value,
                        })
                      }
                      placeholder="Your Discord bot token"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Applications → Bot → Copy TOKEN
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Managed Role ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={discordForm.managedRoleId}
                      onChange={(e) =>
                        setDiscordForm({
                          ...discordForm,
                          managedRoleId: e.target.value,
                        })
                      }
                      placeholder="e.g., 1234567890"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Right-click your role → Copy Role ID. Members will get this role on subscribe.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Managed Channel ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={discordForm.managedChannelId}
                      onChange={(e) =>
                        setDiscordForm({
                          ...discordForm,
                          managedChannelId: e.target.value,
                        })
                      }
                      placeholder="e.g., 1234567890"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Right-click channel → Copy Channel ID. Restrict this channel to the role.
                    </p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition"
                    >
                      {saving ? "Saving..." : "✓ Save Discord"}
                    </button>
                    {discordConfig && (
                      <button
                        type="button"
                        onClick={() => handleRemove("discord")}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Telegram Tab */}
            {activeTab === "telegram" && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="font-bold text-blue-900 mb-4">📋 Setup Guide</h3>
                  <ol className="space-y-3 text-sm text-blue-800">
                    <li>
                      <strong>1. Create Bot:</strong> Message{" "}
                      <a
                        href="https://t.me/botfather"
                        target="_blank"
                        rel="noopener"
                        className="text-blue-600 underline"
                      >
                        @BotFather
                      </a>
                      , send /newbot, follow prompts
                    </li>
                    <li>
                      <strong>2. Copy Token:</strong> BotFather will send your bot token
                    </li>
                    <li>
                      <strong>3. Create Group:</strong> Create a PRIVATE group in Telegram
                    </li>
                    <li>
                      <strong>4. Add Bot:</strong> Search your bot, add to group, make admin
                    </li>
                    <li>
                      <strong>5. Get Group ID:</strong> Message{" "}
                      <a
                        href="https://t.me/userinfobot"
                        target="_blank"
                        rel="noopener"
                        className="text-blue-600 underline"
                      >
                        @userinfobot
                      </a>
                      , forward group message to it
                    </li>
                  </ol>
                </div>

                <form onSubmit={handleTelegramSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telegram Group ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={telegramForm.groupId}
                      onChange={(e) =>
                        setTelegramForm({
                          ...telegramForm,
                          groupId: e.target.value,
                        })
                      }
                      placeholder="e.g., -1001234567890"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Message @userinfobot and forward a group message. It shows your group ID.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bot Token *
                    </label>
                    <input
                      type="password"
                      required
                      value={telegramForm.botToken}
                      onChange={(e) =>
                        setTelegramForm({
                          ...telegramForm,
                          botToken: e.target.value,
                        })
                      }
                      placeholder="Your Telegram bot token"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Message @BotFather. It shows your bot token.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Managed Channel ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={telegramForm.managedChannelId}
                      onChange={(e) =>
                        setTelegramForm({
                          ...telegramForm,
                          managedChannelId: e.target.value,
                        })
                      }
                      placeholder="Channel ID for exclusive content"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium transition"
                    >
                      {saving ? "Saving..." : "✓ Save Telegram"}
                    </button>
                    {telegramConfig && (
                      <button
                        type="button"
                        onClick={() => handleRemove("telegram")}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.push(`/communities/${communityId}/manage`)}
          className="mt-6 px-6 py-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
