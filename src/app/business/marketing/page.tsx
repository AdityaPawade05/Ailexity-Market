"use client";

import { useState } from "react";

const tabs = ["Overview", "Creatives", "Audiences", "Connections"];

export default function BusinessMarketingPage() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [isWaitlistApplied, setIsWaitlistApplied] = useState(false);
  const [campaignStatus, setCampaignStatus] = useState<"inactive" | "active" | "paused">("inactive");
  const [creativeAssets, setCreativeAssets] = useState<string[]>(["Hero Banner", "Sidebar Card", "Email Header"]);
  const [audience, setAudience] = useState("All buyers");
  const [connections, setConnections] = useState({ facebook: true, google: false, instagram: false });
  const [message, setMessage] = useState<string | null>(null);

  const showMessage = (value: string) => {
    setMessage(value);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleApplyForWaitlist = () => {
    if (isWaitlistApplied) {
      showMessage("Already on waitlist!");
      return;
    }
    setIsWaitlistApplied(true);
    showMessage("Success! You are on the waitlist for Whop ads.");
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

  const addCreative = () => {
    const nextName = `Creative Asset ${creativeAssets.length + 1}`;
    setCreativeAssets((assets) => [...assets, nextName]);
    showMessage(`Added ${nextName}.`);
  };

  const toggleConnection = (key: keyof typeof connections) => {
    setConnections((prev) => ({ ...prev, [key]: !prev[key] }));
    showMessage(`${key.charAt(0).toUpperCase() + key.slice(1)} connection ${connections[key] ? "disabled" : "enabled"}`);
  };

  const setAudiencePreset = (option: string) => {
    setAudience(option);
    showMessage(`Audience changed to ${option}.`);
  };

  return (
    <div className="p-8 font-sans w-full max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-1">Ads</h1>
          <p className="text-sm text-zinc-500 max-w-xl">
            Reach millions through Whop ads. Target high intent users via search, discovery, and our other social surfaces.
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
        <nav className="flex gap-2">
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
              Connect with your audience and grow sales by showcasing your products via curated ads in the marketplace.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="text-xs text-zinc-500 uppercase mb-1">Gross revenue</div>
                <div className="text-2xl font-bold text-zinc-900">$6,540</div>
              </div>
              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="text-xs text-zinc-500 uppercase mb-1">Clicks</div>
                <div className="text-2xl font-bold text-zinc-900">1,480</div>
              </div>
              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="text-xs text-zinc-500 uppercase mb-1">Conversions</div>
                <div className="text-2xl font-bold text-zinc-900">234</div>
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
            <div className="mt-4 space-y-2">
              {creativeAssets.map((asset) => (
                <div key={asset} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
                  <div>{asset}</div>
                  <button
                    onClick={() => {
                      setCreativeAssets((curr) => curr.filter((item) => item !== asset));
                      showMessage(`${asset} removed`);
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addCreative}
              className="mt-4 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              + Add creative
            </button>
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
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${audience === option ? 'bg-amber-100 text-amber-900 font-semibold' : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'}`}
                >
                  {option}
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
      </section>
    </div>
  );
}
