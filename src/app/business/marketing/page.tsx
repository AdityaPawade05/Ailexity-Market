"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const tabs = [
  "Overview",
  "Creatives",
  "Audiences",
  "Connections",
  "Discount codes",
  "Affiliate links",
  "Announcements",
];

type Product = { id: string; title: string };

type DiscountCodeRow = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  maxRedemptions: number | null;
  timesRedeemed: number;
  active: boolean;
  expiresAt: string | null;
  product: { id: string; title: string } | null;
};

type AffiliateLinkRow = {
  id: string;
  code: string;
  commissionRate: number;
  clicks: number;
  conversions: number;
  totalEarned: number;
  active: boolean;
  product: { id: string; title: string };
  affiliateUser: { id: string; name: string; email: string } | null;
};

type CampaignRow = {
  id: string;
  subject: string;
  message: string;
  recipientCount: number;
  createdAt: string;
};

type Creative = { id: string; name: string; assetUrl: string | null; createdAt: string };

type OverviewData = {
  grossRevenue: number;
  clicks: number;
  conversions: number;
  affiliateLinksCount: number;
  affiliateEarned: number;
  discountCodesCount: number;
  discountRedemptions: number;
  campaignsSent: number;
  campaignRecipients: number;
};

function MarketingContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(() => {
    const fromUrl = searchParams.get("tab");
    return fromUrl && tabs.includes(fromUrl) ? fromUrl : "Overview";
  });

  const [isWaitlistApplied, setIsWaitlistApplied] = useState(false);
  const [campaignStatus, setCampaignStatus] = useState<"inactive" | "active" | "paused">("inactive");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [creativeForm, setCreativeForm] = useState({ name: "", assetUrl: "" });
  const [audience, setAudience] = useState("All buyers");
  const [audienceCounts, setAudienceCounts] = useState<Record<string, number> | null>(null);
  const [connections, setConnections] = useState({ facebook: false, google: false, instagram: false });
  const [message, setMessage] = useState<string | null>(null);

  const [origin, setOrigin] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  const [discountCodes, setDiscountCodes] = useState<DiscountCodeRow[]>([]);
  const [codeForm, setCodeForm] = useState({
    code: "",
    productId: "",
    type: "PERCENT" as "PERCENT" | "FIXED",
    value: "",
    maxRedemptions: "",
    expiresAt: "",
  });

  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLinkRow[]>([]);
  const [linkForm, setLinkForm] = useState({ productId: "", affiliateEmail: "", commissionRate: "10" });

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [campaignForm, setCampaignForm] = useState({ subject: "", message: "" });
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  const showMessage = (value: string) => {
    setMessage(value);
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/my-products")
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, []);

  async function loadDiscountCodes() {
    const res = await fetch("/api/marketing/discount-codes");
    const data = await res.json();
    if (res.ok) setDiscountCodes(data.codes || []);
  }

  async function loadAffiliateLinks() {
    const res = await fetch("/api/marketing/affiliate-links");
    const data = await res.json();
    if (res.ok) setAffiliateLinks(data.links || []);
  }

  async function loadCampaigns() {
    const res = await fetch("/api/marketing/email-campaigns");
    const data = await res.json();
    if (res.ok) setCampaigns(data.campaigns || []);
  }

  async function loadOverview() {
    const res = await fetch("/api/marketing/overview");
    const data = await res.json();
    if (res.ok) setOverview(data);
  }

  async function loadCreatives() {
    const res = await fetch("/api/marketing/creatives");
    const data = await res.json();
    if (res.ok) setCreatives(data.creatives || []);
  }

  async function loadSettings() {
    const res = await fetch("/api/marketing/settings");
    const data = await res.json();
    if (res.ok) {
      setAudience(data.audiencePreset);
      setConnections({
        facebook: data.facebookConnected,
        google: data.googleConnected,
        instagram: data.instagramConnected,
      });
    }
  }

  async function loadAudienceCounts() {
    const res = await fetch("/api/marketing/audiences");
    const data = await res.json();
    if (res.ok) setAudienceCounts(data);
  }

  useEffect(() => {
    if (activeTab === "Overview") loadOverview();
    if (activeTab === "Creatives") loadCreatives();
    if (activeTab === "Audiences") {
      loadSettings();
      loadAudienceCounts();
    }
    if (activeTab === "Connections") loadSettings();
    if (activeTab === "Discount codes") loadDiscountCodes();
    if (activeTab === "Affiliate links") loadAffiliateLinks();
    if (activeTab === "Announcements") {
      loadCampaigns();
      if (user) {
        fetch(`/api/profiles/${user.id}`)
          .then((res) => res.json())
          .then((data) => setFollowerCount(data.stats?.followersCount ?? 0))
          .catch(() => setFollowerCount(null));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function handleCreateCode(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/marketing/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: codeForm.code,
        productId: codeForm.productId || undefined,
        type: codeForm.type,
        value: Number(codeForm.value),
        maxRedemptions: codeForm.maxRedemptions || undefined,
        expiresAt: codeForm.expiresAt || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error || "Failed to create discount code");
      return;
    }
    setCodeForm({ code: "", productId: "", type: "PERCENT", value: "", maxRedemptions: "", expiresAt: "" });
    showMessage(`Discount code ${data.code} created.`);
    loadDiscountCodes();
  }

  async function toggleCode(id: string, active: boolean) {
    await fetch(`/api/marketing/discount-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    loadDiscountCodes();
  }

  async function deleteCode(id: string) {
    await fetch(`/api/marketing/discount-codes/${id}`, { method: "DELETE" });
    loadDiscountCodes();
  }

  async function handleCreateLink(e: FormEvent) {
    e.preventDefault();
    if (!linkForm.productId) {
      showMessage("Choose a product first");
      return;
    }
    const res = await fetch("/api/marketing/affiliate-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: linkForm.productId,
        affiliateEmail: linkForm.affiliateEmail || undefined,
        commissionRate: linkForm.commissionRate ? Number(linkForm.commissionRate) / 100 : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error || "Failed to create affiliate link");
      return;
    }
    setLinkForm({ productId: "", affiliateEmail: "", commissionRate: "10" });
    showMessage("Affiliate link created.");
    loadAffiliateLinks();
  }

  async function toggleLink(id: string, active: boolean) {
    await fetch(`/api/marketing/affiliate-links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    loadAffiliateLinks();
  }

  async function deleteLink(id: string) {
    await fetch(`/api/marketing/affiliate-links/${id}`, { method: "DELETE" });
    loadAffiliateLinks();
  }

  async function handleSendCampaign(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/marketing/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignForm),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error || "Failed to send announcement");
        return;
      }
      setCampaignForm({ subject: "", message: "" });
      showMessage(`Announcement queued for ${data.campaign.recipientCount} followers.`);
      loadCampaigns();
    } finally {
      setSending(false);
    }
  }

  const handleApplyForWaitlist = () => {
    if (isWaitlistApplied) {
      showMessage("Already on waitlist!");
      return;
    }
    setIsWaitlistApplied(true);
    showMessage("Success! You are on the waitlist for Ailexity ads.");
  };

  const handleLaunchCampaign = () => {
    if (campaignStatus === "inactive" || campaignStatus === "paused") {
      setCampaignStatus("active");
      showMessage("Campaign launched and now live!");
      return;
    }

    setCampaignStatus("paused");
    showMessage("Campaign paused. Click launch to resume.");
  };

  async function handleAddCreative(e: FormEvent) {
    e.preventDefault();
    if (!creativeForm.name.trim()) return;
    const res = await fetch("/api/marketing/creatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: creativeForm.name,
        assetUrl: creativeForm.assetUrl || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.error || "Failed to add creative");
      return;
    }
    setCreativeForm({ name: "", assetUrl: "" });
    showMessage(`Added ${data.name}.`);
    loadCreatives();
  }

  async function deleteCreative(id: string, name: string) {
    await fetch(`/api/marketing/creatives/${id}`, { method: "DELETE" });
    showMessage(`${name} removed`);
    loadCreatives();
  }

  const connectionFieldMap = {
    facebook: "facebookConnected",
    google: "googleConnected",
    instagram: "instagramConnected",
  } as const;

  async function toggleConnection(key: keyof typeof connections) {
    const nextValue = !connections[key];
    setConnections((prev) => ({ ...prev, [key]: nextValue }));
    showMessage(`${key.charAt(0).toUpperCase() + key.slice(1)} connection ${nextValue ? "enabled" : "disabled"}`);
    await fetch("/api/marketing/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [connectionFieldMap[key]]: nextValue }),
    });
  }

  async function setAudiencePreset(option: string) {
    setAudience(option);
    showMessage(`Audience changed to ${option}.`);
    await fetch("/api/marketing/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audiencePreset: option }),
    });
  }

  return (
    <div className="p-8 font-sans w-full max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-1">Ads</h1>
          <p className="text-sm text-zinc-500 max-w-xl">
            Reach millions through Ailexity ads. Target high intent users via search, discovery, and our other social surfaces.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleApplyForWaitlist}
            className="rounded-lg bg-white border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {isWaitlistApplied ? "Waitlist applied" : "+ Apply for waitlist"}
          </button>
          <button
            onClick={handleLaunchCampaign}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            {campaignStatus === "inactive" && "Launch campaign"}
            {campaignStatus === "active" && "Pause campaign"}
            {campaignStatus === "paused" && "Resume campaign"}
          </button>
          <span className="text-xs rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-amber-700">
            Status: {campaignStatus === "inactive" ? "Not started" : campaignStatus === "active" ? "Live" : "Paused"}
          </span>
        </div>
      </div>

      <div className="mb-6 border-b border-zinc-200">
        <nav className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium ${activeTab === tab ? "border border-zinc-200 border-b-white bg-white text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <section className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
        {activeTab === "Overview" && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">Overview</h2>
            <p className="text-sm text-zinc-600 mb-4">
              Real totals from your discount codes, affiliate links, and email campaigns.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="text-xs text-zinc-500 uppercase mb-1">Gross revenue</div>
                <div className="text-2xl font-bold text-zinc-900">${(overview?.grossRevenue ?? 0).toFixed(2)}</div>
                <div className="text-xs text-zinc-400 mt-1">Attributed to discount codes &amp; affiliate links</div>
              </div>
              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="text-xs text-zinc-500 uppercase mb-1">Clicks</div>
                <div className="text-2xl font-bold text-zinc-900">{overview?.clicks ?? 0}</div>
                <div className="text-xs text-zinc-400 mt-1">Across {overview?.affiliateLinksCount ?? 0} affiliate links</div>
              </div>
              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="text-xs text-zinc-500 uppercase mb-1">Conversions</div>
                <div className="text-2xl font-bold text-zinc-900">{overview?.conversions ?? 0}</div>
                <div className="text-xs text-zinc-400 mt-1">{overview?.discountRedemptions ?? 0} discount redemptions</div>
              </div>
            </div>
            <button
              onClick={handleLaunchCampaign}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              {campaignStatus === "active" ? "Pause campaign in overview" : "Launch campaign in overview"}
            </button>
          </div>
        )}

        {activeTab === "Creatives" && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">Creatives</h2>
            <p className="text-sm text-zinc-600">Upload assets and craft compelling ad copy for your products.</p>

            <form onSubmit={handleAddCreative} className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                required
                placeholder="Creative name (e.g. Hero Banner)"
                value={creativeForm.name}
                onChange={(e) => setCreativeForm((f) => ({ ...f, name: e.target.value }))}
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              <input
                placeholder="Asset URL (optional)"
                value={creativeForm.assetUrl}
                onChange={(e) => setCreativeForm((f) => ({ ...f, assetUrl: e.target.value }))}
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap"
              >
                + Add creative
              </button>
            </form>

            <div className="mt-4 space-y-2">
              {creatives.length === 0 ? (
                <p className="text-sm text-zinc-500">No creatives yet.</p>
              ) : (
                creatives.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
                    <div>
                      <div className="font-medium text-zinc-900">{c.name}</div>
                      {c.assetUrl && (
                        <a
                          href={c.assetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-amber-700 hover:underline"
                        >
                          {c.assetUrl}
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => deleteCreative(c.id, c.name)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "Audiences" && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">Audiences</h2>
            <p className="text-sm text-zinc-600">Choose targeting rules for your campaign segments.</p>
            <div className="mt-3 space-y-2">
              {['All buyers', 'Repeat buyers', 'New visitors', 'High intent'].map((option) => (
                <button
                  key={option}
                  onClick={() => setAudiencePreset(option)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${audience === option ? 'bg-amber-100 text-amber-900 font-semibold' : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'}`}
                >
                  <span>{option}</span>
                  <span className="text-xs text-zinc-500">
                    {audienceCounts ? `${audienceCounts[option] ?? 0} buyer${audienceCounts[option] === 1 ? "" : "s"}` : ""}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <span className="text-xs text-zinc-500">Selected audience:</span> <span className="font-semibold text-zinc-700">{audience}</span>
            </div>
          </div>
        )}

        {activeTab === "Connections" && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">Connections</h2>
            <p className="text-sm text-zinc-600">Connect with partners and monitor campaign performance feeds.</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.keys(connections).map((key) => {
                const k = key as keyof typeof connections;
                return (
                  <button
                    key={k}
                    onClick={() => toggleConnection(k)}
                    className={`rounded-lg px-3 py-2 text-sm ${connections[k] ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-50 text-zinc-700 border border-zinc-200 hover:bg-zinc-100'}`}
                  >
                    {k.charAt(0).toUpperCase() + k.slice(1)}: {connections[k] ? 'Connected' : 'Not connected'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "Discount codes" && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">Discount codes</h2>
            <p className="text-sm text-zinc-600 mb-4">
              Create coupon codes buyers can apply at checkout for a real price reduction.
            </p>

            <form onSubmit={handleCreateCode} className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <input
                required
                placeholder="CODE"
                value={codeForm.code}
                onChange={(e) => setCodeForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm uppercase"
              />
              <select
                value={codeForm.productId}
                onChange={(e) => setCodeForm((f) => ({ ...f, productId: e.target.value }))}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">All products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <select
                value={codeForm.type}
                onChange={(e) => setCodeForm((f) => ({ ...f, type: e.target.value as "PERCENT" | "FIXED" }))}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="PERCENT">Percent off</option>
                <option value="FIXED">Fixed amount off</option>
              </select>
              <input
                required
                type="number"
                min={1}
                placeholder={codeForm.type === "PERCENT" ? "% off (1-100)" : "$ off"}
                value={codeForm.value}
                onChange={(e) => setCodeForm((f) => ({ ...f, value: e.target.value }))}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={1}
                placeholder="Max redemptions (optional)"
                value={codeForm.maxRedemptions}
                onChange={(e) => setCodeForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={codeForm.expiresAt}
                onChange={(e) => setCodeForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="col-span-2 sm:col-span-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Create code
              </button>
            </form>

            {discountCodes.length === 0 ? (
              <p className="text-sm text-zinc-500">No discount codes yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-zinc-500 border-b border-zinc-100">
                      <th className="py-2 pr-3">Code</th>
                      <th className="py-2 pr-3">Product</th>
                      <th className="py-2 pr-3">Discount</th>
                      <th className="py-2 pr-3">Used</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {discountCodes.map((c) => (
                      <tr key={c.id} className="border-b border-zinc-50">
                        <td className="py-2 pr-3 font-mono">{c.code}</td>
                        <td className="py-2 pr-3">{c.product?.title || "All products"}</td>
                        <td className="py-2 pr-3">
                          {c.type === "PERCENT" ? `${c.value}%` : `$${c.value.toFixed(2)}`}
                        </td>
                        <td className="py-2 pr-3">
                          {c.timesRedeemed}{c.maxRedemptions !== null ? ` / ${c.maxRedemptions}` : ""}
                        </td>
                        <td className="py-2 pr-3">
                          <span className={c.active ? "text-emerald-600" : "text-zinc-400"}>
                            {c.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right space-x-3">
                          <button onClick={() => toggleCode(c.id, c.active)} className="text-xs text-zinc-600 hover:text-zinc-900">
                            {c.active ? "Deactivate" : "Activate"}
                          </button>
                          <button onClick={() => deleteCode(c.id)} className="text-xs text-red-500 hover:text-red-700">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "Affiliate links" && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">Affiliate links</h2>
            <p className="text-sm text-zinc-600 mb-4">
              Generate a trackable link for a product. Optionally assign it to an Ailexity account to pay a commission on every sale it drives.
            </p>

            <form onSubmit={handleCreateLink} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <select
                value={linkForm.productId}
                onChange={(e) => setLinkForm((f) => ({ ...f, productId: e.target.value }))}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Choose product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <input
                type="email"
                placeholder="Affiliate email (optional)"
                value={linkForm.affiliateEmail}
                onChange={(e) => setLinkForm((f) => ({ ...f, affiliateEmail: e.target.value }))}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={1}
                max={100}
                placeholder="Commission %"
                value={linkForm.commissionRate}
                onChange={(e) => setLinkForm((f) => ({ ...f, commissionRate: e.target.value }))}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Create link
              </button>
            </form>

            {affiliateLinks.length === 0 ? (
              <p className="text-sm text-zinc-500">No affiliate links yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-zinc-500 border-b border-zinc-100">
                      <th className="py-2 pr-3">Link</th>
                      <th className="py-2 pr-3">Product</th>
                      <th className="py-2 pr-3">Affiliate</th>
                      <th className="py-2 pr-3">Rate</th>
                      <th className="py-2 pr-3">Clicks</th>
                      <th className="py-2 pr-3">Sales</th>
                      <th className="py-2 pr-3">Earned</th>
                      <th className="py-2 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {affiliateLinks.map((l) => {
                      const shareUrl = `${origin}/products/${l.product.id}?aff=${l.code}`;
                      return (
                        <tr key={l.id} className="border-b border-zinc-50">
                          <td className="py-2 pr-3">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(shareUrl);
                                showMessage("Link copied!");
                              }}
                              className="font-mono text-xs text-amber-700 hover:underline"
                              title={shareUrl}
                            >
                              {l.code}
                            </button>
                          </td>
                          <td className="py-2 pr-3">{l.product.title}</td>
                          <td className="py-2 pr-3">
                            {l.affiliateUser ? l.affiliateUser.name : "Tracking only"}
                          </td>
                          <td className="py-2 pr-3">{Math.round(l.commissionRate * 100)}%</td>
                          <td className="py-2 pr-3">{l.clicks}</td>
                          <td className="py-2 pr-3">{l.conversions}</td>
                          <td className="py-2 pr-3">${l.totalEarned.toFixed(2)}</td>
                          <td className="py-2 pr-3 text-right space-x-3">
                            <button onClick={() => toggleLink(l.id, l.active)} className="text-xs text-zinc-600 hover:text-zinc-900">
                              {l.active ? "Deactivate" : "Activate"}
                            </button>
                            <button onClick={() => deleteLink(l.id)} className="text-xs text-red-500 hover:text-red-700">
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "Announcements" && (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-3">Announcements</h2>
            <p className="text-sm text-zinc-600 mb-4">
              Send an email to everyone who follows you on Ailexity Market
              {followerCount !== null && ` (${followerCount} follower${followerCount === 1 ? "" : "s"})`}.
            </p>

            <form onSubmit={handleSendCampaign} className="space-y-3 mb-6">
              <input
                required
                placeholder="Subject"
                value={campaignForm.subject}
                onChange={(e) => setCampaignForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              <textarea
                required
                placeholder="Write your announcement..."
                value={campaignForm.message}
                onChange={(e) => setCampaignForm((f) => ({ ...f, message: e.target.value }))}
                rows={5}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={sending || followerCount === 0}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send to followers"}
              </button>
            </form>

            {campaigns.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">Send history</h3>
                <div className="space-y-2">
                  {campaigns.map((c) => (
                    <div key={c.id} className="rounded-lg border border-zinc-200 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-900">{c.subject}</span>
                        <span className="text-xs text-zinc-500">
                          {new Date(c.createdAt).toLocaleDateString()} · {c.recipientCount} recipients
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default function BusinessMarketingPage() {
  return (
    <Suspense fallback={null}>
      <MarketingContent />
    </Suspense>
  );
}
