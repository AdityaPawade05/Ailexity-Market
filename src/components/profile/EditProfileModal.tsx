"use client";

import { useState } from "react";

type EditableProfile = {
  name: string;
  bio: string | null;
  location: string | null;
  avatar: string | null;
  coverImageUrl: string | null;
  socialLinks: string | null;
};

type EditProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profile: EditableProfile;
  onSaved: (updated: Partial<EditableProfile>) => void;
};

export function EditProfileModal({ isOpen, onClose, profile, onSaved }: EditProfileModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: profile.name || "",
    bio: profile.bio || "",
    location: profile.location || "",
    avatar: profile.avatar || "",
    coverImageUrl: profile.coverImageUrl || "",
    socialLinks: profile.socialLinks || "",
  });

  if (!isOpen) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        onSaved(data.user);
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in"
        style={{ animation: "modalSlideUp 0.3s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 shrink-0">
          <button
            onClick={onClose}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <h2 className="text-base font-bold text-zinc-900">Edit Profile</h2>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm font-bold text-amber-600 hover:text-amber-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Done"}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
          {/* Avatar preview */}
          <div className="flex flex-col items-center py-6 bg-gradient-to-b from-zinc-50 to-white">
            <div className="relative">
              <div className="h-20 w-20 rounded-full overflow-hidden bg-amber-100 ring-2 ring-amber-200">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-amber-800">
                    {formData.name.charAt(0) || "?"}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-white">
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-xs text-amber-600 font-medium">Change profile photo</p>
          </div>

          <div className="px-5 pb-6 space-y-0.5">
            {/* Name */}
            <div className="flex items-center border-b border-zinc-100 py-3">
              <label className="w-28 text-sm text-zinc-500 shrink-0">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="flex-1 text-sm text-zinc-900 bg-transparent outline-none placeholder-zinc-300"
                placeholder="Your name"
              />
            </div>

            {/* Bio */}
            <div className="flex items-start border-b border-zinc-100 py-3">
              <label className="w-28 text-sm text-zinc-500 shrink-0 pt-0.5">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                maxLength={150}
                className="flex-1 text-sm text-zinc-900 bg-transparent outline-none resize-none placeholder-zinc-300"
                placeholder="Write a short bio..."
              />
            </div>
            <p className="text-right text-[10px] text-zinc-400 pr-1">{formData.bio.length}/150</p>

            {/* Location */}
            <div className="flex items-center border-b border-zinc-100 py-3">
              <label className="w-28 text-sm text-zinc-500 shrink-0">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="flex-1 text-sm text-zinc-900 bg-transparent outline-none placeholder-zinc-300"
                placeholder="City, Country"
              />
            </div>

            {/* Avatar URL */}
            <div className="flex items-center border-b border-zinc-100 py-3">
              <label className="w-28 text-sm text-zinc-500 shrink-0">Avatar URL</label>
              <input
                type="url"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                className="flex-1 text-sm text-zinc-900 bg-transparent outline-none placeholder-zinc-300 truncate"
                placeholder="https://..."
              />
            </div>

            {/* Website / Social */}
            <div className="flex items-center border-b border-zinc-100 py-3">
              <label className="w-28 text-sm text-zinc-500 shrink-0">Website</label>
              <input
                type="text"
                value={formData.socialLinks}
                onChange={(e) => setFormData({ ...formData, socialLinks: e.target.value })}
                className="flex-1 text-sm text-zinc-900 bg-transparent outline-none placeholder-zinc-300 truncate"
                placeholder="https://yoursite.com"
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
