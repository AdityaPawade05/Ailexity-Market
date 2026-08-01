"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type TxType = "DEPOSIT" | "WITHDRAWAL" | "PURCHASE_DEBIT" | "SALE_CREDIT" | "TRANSFER_OUT" | "TRANSFER_IN" | "REFUND_CREDIT" | "REFUND_DEBIT";

interface WalletTransaction {
  id: string;
  type: TxType;
  amount: number;
  description: string | null;
  createdAt: string;
}

interface TransactionDetail {
  transaction: WalletTransaction;
  purchase: {
    id: string;
    amount: number;
    commissionAmount: number;
    sellerEarning: number;
    createdAt: string;
    product: { id: string; title: string; type: string } | null;
    channel: { id: string; name: string } | null;
    buyer: { id: string; name: string; email: string };
    seller: { id: string; name: string; email: string };
  } | null;
}

const TX_LABELS: Record<TxType, string> = {
  DEPOSIT: "Top Up",
  WITHDRAWAL: "Withdrawal",
  PURCHASE_DEBIT: "Purchase",
  SALE_CREDIT: "Sale Received",
  TRANSFER_OUT: "Sent",
  TRANSFER_IN: "Received",
  REFUND_CREDIT: "Refund Received",
  REFUND_DEBIT: "Refund Issued",
};

const TX_COLOR: Record<TxType, string> = {
  DEPOSIT: "text-emerald-600",
  WITHDRAWAL: "text-red-500",
  PURCHASE_DEBIT: "text-red-500",
  SALE_CREDIT: "text-emerald-600",
  TRANSFER_OUT: "text-red-500",
  TRANSFER_IN: "text-emerald-600",
  REFUND_CREDIT: "text-emerald-600",
  REFUND_DEBIT: "text-red-500",
};

const TX_SIGN: Record<TxType, string> = {
  DEPOSIT: "+",
  WITHDRAWAL: "-",
  PURCHASE_DEBIT: "-",
  SALE_CREDIT: "+",
  TRANSFER_OUT: "-",
  TRANSFER_IN: "+",
  REFUND_CREDIT: "+",
  REFUND_DEBIT: "-",
};

function BalancesContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "product";
  const id = searchParams.get("id") || searchParams.get("productId") || "";

  const { walletBalance, refreshWallet: refreshWalletContext } = useAuth();
  const balance = walletBalance ?? 0;
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedEntity, setFetchedEntity] = useState<{ id?: string; title?: string; name?: string } | null>(null);
  const [activeTab, setActiveTab] = useState("Balances");

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendNote, setSendNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const [selectedTx, setSelectedTx] = useState<TransactionDetail | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const showMessage = (text: string, ok = true) => {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 3500);
  };

  const refreshWallet = useCallback(async () => {
    try {
      const [, txRes] = await Promise.all([
        refreshWalletContext(),
        fetch("/api/wallet/transactions"),
      ]);
      if (txRes.ok) {
        setTransactions(await txRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, [refreshWalletContext]);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  useEffect(() => {
    if (!id) return setFetchedEntity(null);
    const apiUrl = type === "community" ? `/api/channels/${id}` : `/api/products/${id}`;
    fetch(apiUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setFetchedEntity(d?.channel ?? d))
      .catch(console.error);
  }, [id, type]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDepositModal(false);
        setShowWithdrawModal(false);
        setShowSendModal(false);
        setShowOptionsMenu(false);
        setSelectedTx(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return showMessage("Please enter a valid amount.", false);
    setActionLoading(true);
    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) return showMessage(data.error || "Deposit failed.", false);
      setDepositAmount("");
      setShowDepositModal(false);
      showMessage(`Deposited $${amount.toFixed(2)} successfully.`);
      refreshWallet();
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return showMessage("Please enter a valid amount.", false);
    setActionLoading(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) return showMessage(data.error || "Withdrawal failed.", false);
      setWithdrawAmount("");
      setShowWithdrawModal(false);
      showMessage(`Withdrew $${amount.toFixed(2)} successfully.`);
      refreshWallet();
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = async () => {
    const amount = parseFloat(sendAmount);
    if (!amount || amount <= 0) return showMessage("Please enter a valid amount.", false);
    if (!sendRecipient.trim()) return showMessage("Please enter a recipient email.", false);
    setActionLoading(true);
    try {
      const res = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail: sendRecipient.trim(), amount, note: sendNote }),
      });
      const data = await res.json();
      if (!res.ok) return showMessage(data.error || "Transfer failed.", false);
      setSendAmount("");
      setSendRecipient("");
      setSendNote("");
      setShowSendModal(false);
      showMessage(`Sent $${amount.toFixed(2)} to ${sendRecipient.trim()}.`);
      refreshWallet();
    } finally {
      setActionLoading(false);
    }
  };

  const openReceipt = async (txId: string) => {
    setReceiptLoading(true);
    setSelectedTx(null);
    try {
      const res = await fetch(`/api/wallet/transactions/${txId}`);
      if (res.ok) {
        setSelectedTx(await res.json());
      }
    } finally {
      setReceiptLoading(false);
    }
  };

  const entityTitle = fetchedEntity ? fetchedEntity.title || fetchedEntity.name : "";
  const pageTitle = fetchedEntity ? `Balances — ${entityTitle}` : "Balances";

  const withdrawals = transactions.filter((t) => t.type === "WITHDRAWAL");
  const deposits = transactions.filter((t) => t.type === "DEPOSIT");
  const transfers = transactions.filter((t) => t.type === "TRANSFER_OUT" || t.type === "TRANSFER_IN");

  return (
    <div className="p-8 font-sans w-full max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">{pageTitle}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {fetchedEntity
            ? `Financial balances for ${entityTitle}.`
            : "Your wallet — deposit funds, buy products, and collect earnings."}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-sm font-semibold text-zinc-700">Total balance</h2>
              <div className="text-3xl font-bold text-zinc-900 flex items-baseline gap-2">
                ${balance.toFixed(2)}{" "}
                <span className="text-xl text-zinc-500 font-medium">USD</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDepositModal(true)}
                className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 shadow-sm hover:bg-amber-100 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Deposit
              </button>
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 shadow-sm hover:bg-amber-100 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Withdraw
              </button>
              <button
                onClick={() => setShowSendModal(true)}
                className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 shadow-sm hover:bg-amber-100 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                Send
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600 shadow-sm hover:bg-zinc-100 transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {showOptionsMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-200 bg-white shadow-lg z-10">
                    <button className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">Contact support</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6 flex gap-6 border-b border-zinc-200">
            {["Balances", "All activity", "Transfers", "Withdrawals", "Top ups"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium transition ${
                  activeTab === tab
                    ? "border-b-2 border-amber-500 text-amber-900 font-semibold"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {message && (
            <div
              className={`mb-4 rounded-lg px-4 py-2 text-sm ${
                message.ok
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            {activeTab === "Balances" && (
              <div className="rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
                <h3 className="text-lg font-bold text-zinc-900 mb-1">Cash</h3>
                <p className="text-sm text-zinc-500 mb-4">
                  Available to spend on products or to withdraw.
                </p>
                <div className="flex items-center justify-between py-4 border-t border-zinc-100">
                  <span className="text-sm font-medium text-zinc-700">Available balance</span>
                  <span className="text-xl font-bold text-zinc-900">${balance.toFixed(2)}</span>
                </div>
                <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">
                  <strong>How it works:</strong> Deposit funds to your wallet, then use them to purchase products. When you make a sale, 90% of the price is credited to your wallet instantly. Ailexity takes a 10% platform fee.
                </div>
              </div>
            )}

            {activeTab === "All activity" && (
              <TransactionList transactions={transactions} emptyLabel="No activity yet." onSelect={openReceipt} />
            )}

            {activeTab === "Transfers" && (
              <TransactionList transactions={transfers} emptyLabel="No transfers yet." onSelect={openReceipt} />
            )}

            {activeTab === "Withdrawals" && (
              <TransactionList transactions={withdrawals} emptyLabel="No withdrawals yet." onSelect={openReceipt} />
            )}

            {activeTab === "Top ups" && (
              <TransactionList transactions={deposits} emptyLabel="No top-ups yet." onSelect={openReceipt} />
            )}
          </div>
        </>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <Modal title="Deposit Funds" onClose={() => setShowDepositModal(false)}>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Enter amount (USD)"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none mb-4"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowDepositModal(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">
              Cancel
            </button>
            <button
              onClick={handleDeposit}
              disabled={actionLoading}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {actionLoading ? "Processing..." : "Deposit"}
            </button>
          </div>
        </Modal>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <Modal title="Withdraw Funds" onClose={() => setShowWithdrawModal(false)}>
          <p className="text-sm text-zinc-500 mb-3">Available: <strong>${balance.toFixed(2)}</strong></p>
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Enter amount (USD)"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none mb-4"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowWithdrawModal(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">
              Cancel
            </button>
            <button
              onClick={handleWithdraw}
              disabled={actionLoading}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {actionLoading ? "Processing..." : "Withdraw"}
            </button>
          </div>
        </Modal>
      )}

      {/* Send Modal */}
      {showSendModal && (
        <Modal title="Send Money" onClose={() => setShowSendModal(false)}>
          <p className="text-sm text-zinc-500 mb-3">Available: <strong>${balance.toFixed(2)}</strong></p>
          <input
            type="email"
            value={sendRecipient}
            onChange={(e) => setSendRecipient(e.target.value)}
            placeholder="Recipient's email"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none mb-3"
            autoFocus
          />
          <input
            type="number"
            value={sendAmount}
            onChange={(e) => setSendAmount(e.target.value)}
            placeholder="Enter amount (USD)"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none mb-3"
          />
          <input
            type="text"
            value={sendNote}
            onChange={(e) => setSendNote(e.target.value)}
            placeholder="Add a note (optional)"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none mb-4"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowSendModal(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={actionLoading}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {actionLoading ? "Sending..." : "Send"}
            </button>
          </div>
        </Modal>
      )}

      {/* Receipt Modal */}
      {(receiptLoading || selectedTx) && (
        <Modal title="Transaction Receipt" onClose={() => setSelectedTx(null)}>
          {receiptLoading ? (
            <div className="h-32 animate-pulse rounded-lg bg-zinc-100" />
          ) : selectedTx ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Type</span>
                <span className="font-medium text-zinc-900">{TX_LABELS[selectedTx.transaction.type] ?? selectedTx.transaction.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Amount</span>
                <span className={`font-semibold ${TX_COLOR[selectedTx.transaction.type]}`}>
                  {TX_SIGN[selectedTx.transaction.type]}${selectedTx.transaction.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Date</span>
                <span className="text-zinc-700">{new Date(selectedTx.transaction.createdAt).toLocaleString()}</span>
              </div>
              {selectedTx.transaction.description && (
                <div>
                  <span className="text-zinc-500">Description</span>
                  <p className="mt-1 text-zinc-700">{selectedTx.transaction.description}</p>
                </div>
              )}
              {selectedTx.purchase && (
                <>
                  <hr className="border-zinc-100" />
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Item</span>
                    <span className="font-medium text-zinc-900">
                      {selectedTx.purchase.product?.title ?? selectedTx.purchase.channel?.name ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Buyer</span>
                    <span className="text-zinc-700">{selectedTx.purchase.buyer.name} ({selectedTx.purchase.buyer.email})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Seller</span>
                    <span className="text-zinc-700">{selectedTx.purchase.seller.name} ({selectedTx.purchase.seller.email})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Total price</span>
                    <span className="text-zinc-700">${selectedTx.purchase.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Platform fee (10%)</span>
                    <span className="text-zinc-700">${selectedTx.purchase.commissionAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Seller earning</span>
                    <span className="text-zinc-700">${selectedTx.purchase.sellerEarning.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-end pt-2">
                <button onClick={() => setSelectedTx(null)} className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200">
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}

function TransactionList({
  transactions,
  emptyLabel,
  onSelect,
}: {
  transactions: WalletTransaction[];
  emptyLabel: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
      {transactions.length === 0 ? (
        <div className="text-center text-sm text-zinc-500 py-8">{emptyLabel}</div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {transactions.map((tx) => (
            <li
              key={tx.id}
              onClick={() => onSelect?.(tx.id)}
              className={`flex items-center justify-between py-3 ${onSelect ? "cursor-pointer hover:bg-zinc-50 -mx-2 px-2 rounded-lg transition" : ""}`}
            >
              <div>
                <p className="text-sm font-medium text-zinc-800">
                  {TX_LABELS[tx.type as TxType] ?? tx.type}
                </p>
                {tx.description && (
                  <p className="text-xs text-zinc-500 mt-0.5">{tx.description}</p>
                )}
                <p className="text-xs text-zinc-400 mt-0.5">
                  {new Date(tx.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span className={`text-sm font-semibold ${TX_COLOR[tx.type as TxType] ?? "text-zinc-700"}`}>
                {TX_SIGN[tx.type as TxType]}${tx.amount.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-zinc-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function BalancesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        </div>
      }
    >
      <BalancesContent />
    </Suspense>
  );
}
