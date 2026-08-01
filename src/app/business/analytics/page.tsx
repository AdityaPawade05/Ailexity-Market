"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type PeriodSummary = {
  start: string;
  end: string;
  totalRevenue: number;
  totalSales: number;
  customers: number;
};

type SeriesPoint = { date: string; revenue: number; sales: number };

type Analytics = {
  range: string;
  current: PeriodSummary;
  previous: PeriodSummary;
  series: SeriesPoint[];
  productsLive: number;
  walletBalance: number;
  payoutsTotal: number;
};

type EntitySummary = { id: string; title?: string; name?: string };

const RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function ChangeBadge({ current, previous }: { current: number; previous: number }) {
  const change = percentChange(current, previous);
  if (change === null) {
    return <span className="text-xs font-medium text-zinc-400">New</span>;
  }
  const isUp = change >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        isUp ? "text-emerald-600" : "text-red-500"
      }`}
    >
      <svg
        className={`w-3 h-3 ${isUp ? "" : "rotate-180"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

function AnalyticsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [products, setProducts] = useState<EntitySummary[]>([]);
  const type = searchParams.get("type") || "product";
  const selectedId = searchParams.get("id") || searchParams.get("productId") || "";
  const range = searchParams.get("range") || "7d";
  const [fetched, setFetched] = useState<{ id: string; entity: EntitySummary } | null>(null);
  const [showMarketingBanner, setShowMarketingBanner] = useState(true);

  useEffect(() => {
    if (!selectedId) return;
    const apiUrl = type === "community" ? `/api/channels/${selectedId}` : `/api/products/${selectedId}`;
    fetch(apiUrl)
      .then(async (r) => {
        if (!r.ok) {
          const error = await r.text();
          throw new Error(error || `Request failed with status ${r.status}`);
        }
        return r.json();
      })
      .then((data) => setFetched({ id: selectedId, entity: data?.channel ?? data }))
      .catch(console.error);
  }, [selectedId, type]);

  // Only use the fetched entity if it matches the current selection.
  const fetchedEntity = fetched?.id === selectedId ? fetched.entity : null;

  useEffect(() => {
    if (user) {
      fetch("/api/my-products")
        .then(async (r) => {
          if (!r.ok) {
            const error = await r.text();
            throw new Error(error || `Request failed with status ${r.status}`);
          }
          return r.json();
        })
        .then((p) => setProducts(p))
        .catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const params = new URLSearchParams({ range });
      if (selectedId) params.set(type === "community" ? "channelId" : "productId", selectedId);

      fetch(`/api/dashboard/analytics?${params.toString()}`)
        .then(async (r) => {
          if (!r.ok) {
            const error = await r.text();
            throw new Error(error || `Request failed with status ${r.status}`);
          }
          return r.json();
        })
        .then((s) => setAnalytics(s))
        .catch(console.error);
    }
  }, [user, selectedId, type, range]);

  const selectedProduct = products.find((product) => product.id === selectedId) || fetchedEntity;
  const entityTitle = selectedProduct ? (selectedProduct.title || selectedProduct.name) : "";
  const title = selectedProduct ? `Analytics — ${entityTitle}` : "Analytics";

  const setProductInUrl = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("type", "product");
      params.set("id", id);
    } else {
      params.delete("type");
      params.delete("id");
      params.delete("productId");
    }
    router.replace(`/business/analytics${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const setRangeInUrl = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.replace(`/business/analytics?${params.toString()}`);
  };

  const current = analytics?.current;
  const previous = analytics?.previous;
  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label ?? "Last 7 days";

  return (
    <div className="p-8 font-sans w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 items-start justify-between mb-8 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {selectedProduct
              ? `Showing ${type} analytics for ${entityTitle}.`
              : "Select a product from the list below to view analysis for a specific product."}
          </p>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* Main Chart Area */}
        <div className="flex-1 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm relative h-96">
          <div className="flex items-center gap-12 mb-4">
            <div>
              <div className="text-sm font-medium text-zinc-500">Gross revenue</div>
              <div className="font-semibold text-zinc-900 mt-1 text-xl">
                ${(current?.totalRevenue ?? 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-500">vs previous period</div>
              <div className="mt-1.5">
                {current && previous ? (
                  <ChangeBadge current={current.totalRevenue} previous={previous.totalRevenue} />
                ) : (
                  <span className="text-sm text-zinc-400">--</span>
                )}
              </div>
            </div>
          </div>

          {!analytics ? (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          ) : analytics.series.every((p) => p.sales === 0) ? (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-500">No sales in this period</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={analytics.series} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f4f4f5" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis hide domain={[0, (max: number) => (max <= 0 ? 10 : max * 1.2)]} />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, "Revenue"]}
                  labelFormatter={(label) => formatShort(String(label))}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 shrink-0 space-y-6">
          <div className="bg-white/80 p-6 rounded-xl border border-zinc-200 shadow-sm backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm font-medium text-zinc-900">Total balance</div>
              <a href="/business/balances" className="text-sm font-medium text-amber-600 hover:text-amber-700 transition">View</a>
            </div>
            <div className="text-3xl font-bold text-zinc-900 mb-1">
              ${(analytics?.walletBalance ?? 0).toFixed(2)}
            </div>
            <div className="text-xs font-medium text-zinc-500 mb-4">
              ${(analytics?.walletBalance ?? 0).toFixed(2)} available
            </div>
          </div>

          <div className="bg-white/80 p-6 rounded-xl border border-zinc-200 shadow-sm backdrop-blur-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="text-sm font-medium text-zinc-900">Payouts</div>
              <a href="/business/payments" className="text-sm font-medium text-amber-600 hover:text-amber-700 transition">View</a>
            </div>
            <div className="text-zinc-900 font-semibold">
              ${(analytics?.payoutsTotal ?? 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Banner */}
      {showMarketingBanner && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
             <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
             <a href="/business/marketing" className="text-amber-600 font-semibold hover:underline">Start marketing</a> your products across social platforms.
          </div>
          <button onClick={() => setShowMarketingBanner(false)} className="text-zinc-400 hover:text-zinc-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Stats Table Area */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-zinc-900 mb-4">Stats</h2>
        <div className="flex flex-wrap items-center gap-4 mb-6">
           <select
             className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 outline-none hover:bg-zinc-50 cursor-pointer appearance-none pr-8"
             style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E")`, backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat' }}
             value={range}
             onChange={(e) => setRangeInUrl(e.target.value)}
           >
             {RANGE_OPTIONS.map((opt) => (
               <option key={opt.value} value={opt.value}>{opt.label}</option>
             ))}
           </select>
           {current && previous && (
             <span className="text-sm text-zinc-500">
               {formatShort(current.start)} – {formatShort(current.end)} vs. previous {rangeLabel.toLowerCase().replace("last ", "")}
             </span>
           )}
        </div>
        <div className="flex items-center gap-2 mb-6">
           <span className="text-sm text-zinc-500">on</span>
           <select
             className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 outline-none hover:bg-zinc-50 cursor-pointer appearance-none pr-8 relative"
             style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23a1a1aa%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E")`, backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat' }}
             value={selectedId}
             onChange={(e) => setProductInUrl(e.target.value)}
           >
             <option value="">All products</option>
             {products.map((p) => (
               <option key={p.id} value={p.id}>{p.title}</option>
             ))}
             {selectedId && !products.find(p => p.id === selectedId) && fetchedEntity && (
               <option key={selectedId} value={selectedId}>{entityTitle}</option>
             )}
           </select>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                 <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1 border-b border-zinc-300 border-dashed inline-block pb-0.5">Gross revenue</div>
                 <div className="text-2xl font-bold text-zinc-900">${(current?.totalRevenue ?? 0).toFixed(2)}</div>
              </div>
              {current && previous && <ChangeBadge current={current.totalRevenue} previous={previous.totalRevenue} />}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                 <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1 border-b border-zinc-300 border-dashed inline-block pb-0.5">Total Sales</div>
                 <div className="text-2xl font-bold text-zinc-900">{current?.totalSales ?? 0}</div>
              </div>
              {current && previous && <ChangeBadge current={current.totalSales} previous={previous.totalSales} />}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                 <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1 border-b border-zinc-300 border-dashed inline-block pb-0.5">Customers</div>
                 <div className="text-2xl font-bold text-zinc-900">{current?.customers ?? 0}</div>
              </div>
              {current && previous && <ChangeBadge current={current.customers} previous={previous.customers} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    }>
      <AnalyticsContent />
    </Suspense>
  );
}
