"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "next/navigation";

function BalancesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "product";
  const id = searchParams.get("id") || searchParams.get("productId") || "";
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [fetchedEntity, setFetchedEntity] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Balances");
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [moveAmount, setMoveAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      showMessage("Please enter a valid deposit amount.");
      return;
    }
    // Simulate deposit
    setBalance(prev => prev + amount);
    setDepositAmount("");
    setShowDepositModal(false);
    showMessage(`Deposited $${amount.toFixed(2)} successfully.`);
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || amount > balance) {
      showMessage("Please enter a valid withdrawal amount.");
      return;
    }
    // Simulate withdrawal
    setBalance(prev => prev - amount);
    setWithdrawAmount("");
    setShowWithdrawModal(false);
    showMessage(`Withdrew $${amount.toFixed(2)} successfully.`);
  };

  const handleMove = () => {
    const amount = parseFloat(moveAmount);
    if (!amount || amount <= 0 || amount > balance) {
      showMessage("Please enter a valid amount to move.");
      return;
    }
    // Simulate move to treasury
    setBalance(prev => prev - amount);
    setMoveAmount("");
    setShowMoveModal(false);
    showMessage(`Moved $${amount.toFixed(2)} to treasury.`);
  };

  const handleCreateProduct = () => {
    showMessage("Redirecting to product creation with AI...");
    // In a real app, this would navigate to /business/products/new or similar
  };

  const handleSimulate = () => {
    showMessage("Opening yield simulator...");
    // In a real app, this would open a modal or navigate to a simulator page
  };

  useEffect(() => {
    if (id) {
      const apiUrl = type === "community" ? `/api/channels/${id}` : `/api/products/${id}`;
      fetch(apiUrl)
        .then(async (r) => {
          if (!r.ok) {
            const error = await r.text();
            throw new Error(error || `Request failed with status ${r.status}`);
          }
          return r.json();
        })
        .then((p) => setFetchedEntity(p))
        .catch(console.error);
    } else {
      setFetchedEntity(null);
    }
  }, [id, type]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDepositModal(false);
        setShowWithdrawModal(false);
        setShowMoveModal(false);
        setShowOptionsMenu(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const entityTitle = fetchedEntity ? (fetchedEntity.title || fetchedEntity.name) : "";
  const title = fetchedEntity ? `Balances — ${entityTitle}` : "Balances";

  return (
    <div className="p-8 font-sans w-full max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {fetchedEntity
            ? `Viewing financial balances for ${entityTitle}.`
            : "Manage your earnings, payouts, and treasury."}
        </p>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-sm font-semibold text-zinc-700">
            {fetchedEntity ? "Entity revenue" : "Total balance"}
          </h2>
          <div className="text-3xl font-bold text-zinc-900 flex items-baseline gap-2">
            ${balance.toFixed(2)} <span className="text-xl text-zinc-500 font-medium">USD</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowDepositModal(true)}
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 shadow-sm hover:bg-amber-100 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Deposit
          </button>
          <button 
            onClick={() => setShowWithdrawModal(true)}
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 shadow-sm hover:bg-amber-100 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Withdraw
          </button>
          <button 
            onClick={() => setShowMoveModal(true)}
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 shadow-sm hover:bg-amber-100 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            Move
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600 shadow-sm hover:bg-zinc-100 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            </button>
            {showOptionsMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-200 bg-white shadow-lg z-10">
                <button className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">View statements</button>
                <button className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">Download CSV</button>
                <button className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">Contact support</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-6 border-b border-zinc-200">
        <button 
          onClick={() => setActiveTab("Balances")}
          className={`pb-3 text-sm font-semibold transition ${activeTab === "Balances" ? "border-b-2 border-amber-500 text-amber-900" : "text-zinc-500 hover:text-zinc-900"}`}
        >
          Balances
        </button>
        <button 
          onClick={() => setActiveTab("All activity")}
          className={`pb-3 text-sm font-medium transition ${activeTab === "All activity" ? "border-b-2 border-amber-500 text-amber-900" : "text-zinc-500 hover:text-zinc-900"}`}
        >
          All activity
        </button>
        <button 
          onClick={() => setActiveTab("Withdrawals")}
          className={`pb-3 text-sm font-medium transition ${activeTab === "Withdrawals" ? "border-b-2 border-amber-500 text-amber-900" : "text-zinc-500 hover:text-zinc-900"}`}
        >
          Withdrawals
        </button>
        <button 
          onClick={() => setActiveTab("Top ups")}
          className={`pb-3 text-sm font-medium transition ${activeTab === "Top ups" ? "border-b-2 border-amber-500 text-amber-900" : "text-zinc-500 hover:text-zinc-900"}`}
        >
          Top ups
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <div className="space-y-4">
        {activeTab === "Balances" && (
          <>
            <div className="rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-900 mb-4">Cash</h3>
              <div 
                onClick={handleCreateProduct}
                className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-8 text-center text-sm font-semibold text-amber-700 flex items-center justify-center cursor-pointer hover:bg-amber-100/50 transition"
              >
                Create a product with AI and start earning
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-sm p-6 shadow-sm flex flex-col items-start gap-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-bold text-zinc-900">Set up Your Treasury</h3>
                <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white flex items-center gap-1">
                  Earn up to 6% APY ⓘ
                </span>
              </div>
              <p className="text-sm text-zinc-600 font-medium">
                Earn yield on your balance automatically. Withdraw anytime with no lock-ins.
              </p>
              <button 
                onClick={handleSimulate}
                className="flex items-center gap-1 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition mt-2"
              >
                Simulate your future <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          </>
        )}

        {activeTab === "All activity" && (
          <div className="rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">All Activity</h3>
            <div className="text-center text-sm text-zinc-500 py-8">
              No activity yet. Start by creating your first product!
            </div>
          </div>
        )}

        {activeTab === "Withdrawals" && (
          <div className="rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">Withdrawals</h3>
            <div className="text-center text-sm text-zinc-500 py-8">
              No withdrawals yet.
            </div>
          </div>
        )}

        {activeTab === "Top ups" && (
          <div className="rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-sm p-6 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">Top Ups</h3>
            <div className="text-center text-sm text-zinc-500 py-8">
              No top-ups yet.
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
        Whop is a technology company, not a bank. Whop cash balances are held for you at Cross River Bank or other partner banks. Whop treasury balances are held in USDT with yield provided by third-party protocols. Balances are not FDIC insured.
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Deposit Funds</h2>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDepositModal(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">Cancel</button>
              <button onClick={handleDeposit} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
                Deposit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Withdraw Funds</h2>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowWithdrawModal(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">Cancel</button>
              <button onClick={handleWithdraw} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Move to Treasury</h2>
            <input
              type="number"
              value={moveAmount}
              onChange={(e) => setMoveAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowMoveModal(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">Cancel</button>
              <button onClick={handleMove} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
                Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BalancesPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    }>
      <BalancesContent />
    </Suspense>
  );
}
