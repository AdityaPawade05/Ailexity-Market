"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  refresh: () => Promise<void>;
  walletBalance: number | null;
  refreshWallet: () => Promise<void>;
  cartCount: number;
  refreshCart: () => Promise<void>;
  wishlistCount: number;
  refreshWishlist: () => Promise<void>;
  unreadMessageCount: number;
  refreshUnreadCount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
  walletBalance: null,
  refreshWallet: async () => {},
  cartCount: 0,
  refreshCart: async () => {},
  wishlistCount: 0,
  refreshWishlist: async () => {},
  unreadMessageCount: 0,
  refreshUnreadCount: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const refreshWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet");
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balance ?? 0);
      } else {
        setWalletBalance(null);
      }
    } catch {
      setWalletBalance(null);
    }
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        setCartCount(Array.isArray(data.items) ? data.items.length : 0);
      } else {
        setCartCount(0);
      }
    } catch {
      setCartCount(0);
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    try {
      const res = await fetch("/api/wishlist");
      if (res.ok) {
        const data = await res.json();
        setWishlistCount(Array.isArray(data.items) ? data.items.length : 0);
      } else {
        setWishlistCount(0);
      }
    } catch {
      setWishlistCount(0);
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadMessageCount(data.count ?? 0);
      } else {
        setUnreadMessageCount(0);
      }
    } catch {
      setUnreadMessageCount(0);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user);
      if (data.user) {
        await Promise.all([refreshWallet(), refreshCart(), refreshWishlist(), refreshUnreadCount()]);
      } else {
        setWalletBalance(null);
        setCartCount(0);
        setWishlistCount(0);
        setUnreadMessageCount(0);
      }
    } catch {
      setUser(null);
      setWalletBalance(null);
      setCartCount(0);
      setWishlistCount(0);
      setUnreadMessageCount(0);
    } finally {
      setLoading(false);
    }
  }, [refreshWallet, refreshCart, refreshWishlist, refreshUnreadCount]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep the navbar's unread-messages badge live even while the user isn't
  // on the messages page itself.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshUnreadCount, 20000);
    return () => clearInterval(interval);
  }, [user, refreshUnreadCount]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refresh,
        walletBalance,
        refreshWallet,
        cartCount,
        refreshCart,
        wishlistCount,
        refreshWishlist,
        unreadMessageCount,
        refreshUnreadCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
