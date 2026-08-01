"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";

type Sale = {
  id: string;
  amount: number;
  discountAmount: number;
  refunded: boolean;
  refundRequestedAt: string | null;
  refundReason: string | null;
  createdAt: string;
  product: { title: string; type: string };
  buyer: { name: string; email: string };
};

type EntitySummary = { id: string; title?: string; name?: string };

const PAGE_SIZE = 20;

function downloadCsv(rows: Sale[]) {
  const header = ["Amount", "Status", "Product", "Type", "Buyer", "Email", "Discount", "Date"];
  const lines = rows.map((s) => [
    s.amount.toFixed(2),
    s.refunded ? "Refunded" : "Paid",
    s.product.title,
    s.product.type,
    s.buyer.name,
    s.buyer.email,
    s.discountAmount > 0 ? s.discountAmount.toFixed(2) : "",
    new Date(s.createdAt).toISOString(),
  ]);
  const csv = [header, ...lines]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function PaymentsList() {
  const { user, refreshWallet } = useAuth();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "product";
  const id = searchParams.get("id") || searchParams.get("productId") || "";
  const salesKey = `${type}|${id}`;
  const [salesResult, setSalesResult] = useState<{ key: string; sales: Sale[] } | null>(null);
  const [fetched, setFetched] = useState<{ id: string; entity: EntitySummary } | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<"amount" | "date">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  async function downloadEarningsReport() {
    setDownloadingReport(true);
    try {
      const year = new Date().getFullYear();
      const res = await fetch(`/api/reports/earnings?year=${year}`);
      if (!res.ok) {
        alert("Failed to build the earnings report");
        return;
      }
      const data: {
        year: number;
        months: { month: number; gross: number; refunded: number; commission: number; net: number; salesCount: number; refundCount: number }[];
        totals: { gross: number; refunded: number; commission: number; net: number; salesCount: number; refundCount: number };
      } = await res.json();

      const monthName = (m: number) =>
        new Date(Date.UTC(2000, m - 1)).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
      const header = ["Month", "Sales", "Refunds", "Gross ($)", "Refunded ($)", "Commission ($)", "Net earnings ($)"];
      const rows = data.months.map((m) => [
        monthName(m.month), m.salesCount, m.refundCount,
        m.gross.toFixed(2), m.refunded.toFixed(2), m.commission.toFixed(2), m.net.toFixed(2),
      ]);
      rows.push([
        "TOTAL", data.totals.salesCount, data.totals.refundCount,
        data.totals.gross.toFixed(2), data.totals.refunded.toFixed(2),
        data.totals.commission.toFixed(2), data.totals.net.toFixed(2),
      ]);
      const csv = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `earnings-${data.year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingReport(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    const apiUrl = type === "community" ? `/api/channels/${id}` : `/api/products/${id}`;
    fetch(apiUrl)
      .then(async (r) => {
        if (!r.ok) {
          const error = await r.text();
          throw new Error(error || `Request failed with status ${r.status}`);
        }
        return r.json();
      })
      .then((p) => setFetched({ id, entity: p?.channel ?? p }))
      .catch(console.error);
  }, [id, type]);

  useEffect(() => {
    if (user) {
      const queryKey = type === 'community' ? 'channelId' : 'productId';
      const url = id
        ? `/api/purchases?as=seller&${queryKey}=${id}`
        : "/api/purchases?as=seller";

      fetch(url)
        .then(async (r) => {
          if (!r.ok) {
            const error = await r.text();
            throw new Error(error || `Request failed with status ${r.status}`);
          }
          return r.json();
        })
        .then((s) => setSalesResult({ key: salesKey, sales: Array.isArray(s) ? s : [] }))
        .catch(console.error);
    }
  }, [user, id, type, salesKey]);

  // Derive view state — stale results (from a previous selection) count as loading.
  const loading = !salesResult || salesResult.key !== salesKey;
  const fetchedEntity = fetched?.id === id ? fetched.entity : null;

  const sales = useMemo(() => {
    const rawSales = salesResult?.key === salesKey ? salesResult.sales : [];
    let list = rawSales;
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((s) => new Date(s.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
      list = list.filter((s) => new Date(s.createdAt).getTime() <= to);
    }
    const sorted = [...list].sort((a, b) => {
      const diff = sortKey === "amount" ? a.amount - b.amount : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
    return sorted;
  }, [salesResult, salesKey, dateFrom, dateTo, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sales.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageSales = sales.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function toggleSort(key: "amount" | "date") {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  async function handleRefund(sale: Sale) {
    const verb = sale.refundRequestedAt ? "Approve the buyer's refund request:" : "Refund";
    if (!confirm(`${verb} $${sale.amount.toFixed(2)} to ${sale.buyer.name} for "${sale.product.title}"? This can't be undone.`)) {
      return;
    }
    setRefundingId(sale.id);
    try {
      const res = await fetch(`/api/purchases/${sale.id}/refund`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to refund");
        return;
      }
      setSalesResult((prev) =>
        prev
          ? { ...prev, sales: prev.sales.map((s) => (s.id === sale.id ? { ...s, refunded: true, refundRequestedAt: null } : s)) }
          : prev
      );
      await refreshWallet();
    } finally {
      setRefundingId(null);
    }
  }

  async function handleReject(sale: Sale) {
    if (!confirm(`Decline ${sale.buyer.name}'s refund request for "${sale.product.title}"?`)) {
      return;
    }
    setRejectingId(sale.id);
    try {
      const res = await fetch(`/api/purchases/${sale.id}/refund-reject`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to decline");
        return;
      }
      setSalesResult((prev) =>
        prev ? { ...prev, sales: prev.sales.map((s) => (s.id === sale.id ? { ...s, refundRequestedAt: null } : s)) } : prev
      );
    } finally {
      setRejectingId(null);
    }
  }

  const entityTitle = fetchedEntity ? (fetchedEntity.title || fetchedEntity.name) : "";
  const title = fetchedEntity ? `Payments — ${entityTitle}` : "Payments";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8 font-sans w-full max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {fetchedEntity
            ? `Showing payments for ${entityTitle}.`
            : "View and manage all payments received from your customers."}
        </p>
      </div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <label className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-zinc-700 shadow-sm">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="outline-none text-zinc-700"
            />
          </label>
          <label className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-zinc-700 shadow-sm">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="outline-none text-zinc-700"
            />
          </label>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
              className="text-xs text-zinc-500 hover:text-zinc-800 underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCsv(sales)}
            disabled={sales.length === 0}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
          <button
            onClick={downloadEarningsReport}
            disabled={downloadingReport}
            title="Yearly earnings summary for tax filing — monthly gross, refunds, commission, and net"
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {downloadingReport ? "Preparing..." : `Earnings report ${new Date().getFullYear()}`}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white border border-zinc-200 rounded-t-xl rounded-b-xl overflow-hidden shadow-sm flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-12 border-b border-zinc-200 bg-white px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
           <button onClick={() => toggleSort("amount")} className="col-span-1 flex items-center gap-1 group cursor-pointer text-left">
             Amount
             <svg className={`w-3 h-3 transition ${sortKey === "amount" ? "opacity-100" : "opacity-0 group-hover:opacity-50"} ${sortKey === "amount" && sortDir === "asc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
           </button>
           <div className="col-span-1">Status</div>
           <div className="col-span-1">Product</div>
           <div className="col-span-1">Plan</div>
           <div className="col-span-1">Paid via</div>
           <div className="col-span-1">User</div>
           <div className="col-span-2">Email</div>
           <div className="col-span-1">Discount</div>
           <button onClick={() => toggleSort("date")} className="col-span-1 flex items-center gap-1 group cursor-pointer text-left">
             Date
             <svg className={`w-3 h-3 transition ${sortKey === "date" ? "opacity-100" : "opacity-0 group-hover:opacity-50"} ${sortKey === "date" && sortDir === "asc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
           </button>
           <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Table Rows or Empty Data */}
        {pageSales.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
             <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-zinc-200 text-3xl">
               💵
             </div>
             <h3 className="text-lg font-bold text-zinc-900 mb-1">No payments yet</h3>
             <p className="text-sm text-zinc-500">
               {dateFrom || dateTo ? "No payments match your date range." : "Payments will show up here once you make a sale."}
             </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {pageSales.map((sale) => (
              <div key={sale.id} className="grid grid-cols-12 border-b border-zinc-100 px-4 py-3 text-sm hover:bg-zinc-50 transition items-center">
                 <div className="col-span-1 font-semibold text-zinc-900">${sale.amount.toFixed(2)}</div>
                 <div className="col-span-1">
                   {sale.refunded ? (
                     <span className="rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Refunded</span>
                   ) : sale.refundRequestedAt ? (
                     <span
                       className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700"
                       title={sale.refundReason ? `Reason: ${sale.refundReason}` : undefined}
                     >
                       Requested
                     </span>
                   ) : (
                     <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">Paid</span>
                   )}
                 </div>
                 <div className="col-span-1 text-zinc-700 truncate pr-2">{sale.product.title}</div>
                 <div className="col-span-1 text-zinc-500 capitalize">{sale.product.type}</div>
                 <div className="col-span-1 text-zinc-500">Wallet</div>
                 <div className="col-span-1 text-zinc-900 truncate">{sale.buyer.name}</div>
                 <div className="col-span-2 text-zinc-500 truncate pr-2">{sale.buyer.email}</div>
                 <div className="col-span-1 text-zinc-500">{sale.discountAmount > 0 ? `-$${sale.discountAmount.toFixed(2)}` : "—"}</div>
                 <div className="col-span-1 text-sm text-zinc-500">{new Date(sale.createdAt).toLocaleDateString()}</div>
                 <div className="col-span-2 text-right space-x-3">
                   {!sale.refunded && sale.refundRequestedAt && (
                     <button
                       onClick={() => handleReject(sale)}
                       disabled={rejectingId === sale.id || refundingId === sale.id}
                       className="text-xs font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
                     >
                       {rejectingId === sale.id ? "Declining..." : "Decline"}
                     </button>
                   )}
                   {!sale.refunded && (
                     <button
                       onClick={() => handleRefund(sale)}
                       disabled={refundingId === sale.id || rejectingId === sale.id}
                       className="text-xs font-medium text-rose-600 hover:text-rose-800 disabled:opacity-50"
                     >
                       {refundingId === sale.id ? "Refunding..." : sale.refundRequestedAt ? "Approve" : "Refund"}
                     </button>
                   )}
                 </div>
              </div>
            ))}
          </div>
        )}

        {sales.length > 0 && (
          <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-500">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, sales.length)} of {sales.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={currentPage === pageCount}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsList />
    </Suspense>
  );
}
