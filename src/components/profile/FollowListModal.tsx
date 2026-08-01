"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type UserItem = {
  id: string;
  name: string;
  avatar: string | null;
  isFollowing: boolean;
};

type FollowListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  type: "followers" | "following";
  onFollowToggle?: (userId: string, isFollowing: boolean) => void;
};

export function FollowListModal({ isOpen, onClose, profileId, type, onFollowToggle }: FollowListModalProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !profileId) return;
    
    setLoading(true);
    fetch(`/api/users/${profileId}/network?type=${type}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.users) {
          setUsers(data.users);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, profileId, type]);

  if (!isOpen) return null;

  async function handleToggleFollow(targetId: string) {
    if (!user) {
      alert("Please log in to perform this action.");
      return;
    }
    if (processingId) return;

    setProcessingId(targetId);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetId }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === targetId ? { ...u, isFollowing: data.following } : u))
        );
        if (onFollowToggle) {
          onFollowToggle(targetId, data.following);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm shadow-2xl">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 shrink-0">
          <div className="w-8" />
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 capitalize text-center">
            {type}
          </h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 transition-colors w-8 h-8 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto min-h-[300px] p-2">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-zinc-500 gap-2 p-8 text-center">
               <svg className="w-12 h-12 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               <p className="text-sm">No {type} yet.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors rounded-xl group/user">
                  <Link href={`/profile/${u.id}`} onClick={onClose} className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-amber-100 flex items-center justify-center">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="h-full w-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="font-bold text-amber-800 text-sm">{u.name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900 group-hover/user:text-amber-600 transition-colors">{u.name}</p>
                    </div>
                  </Link>

                  {user?.id !== u.id && (
                    <button
                      onClick={() => handleToggleFollow(u.id)}
                      disabled={processingId === u.id}
                      className={`shrink-0 rounded-lg px-4 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                        u.isFollowing 
                          ? "bg-zinc-100 text-zinc-700 hover:bg-red-50 hover:text-red-600 hover:border-red-100 border border-transparent" 
                          : "bg-amber-500 text-white hover:bg-amber-600 shadow-sm border border-transparent"
                      } ${processingId === u.id ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {u.isFollowing ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
