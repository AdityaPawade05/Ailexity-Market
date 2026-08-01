"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { uploadFile } from "@/lib/upload";

export default function CreatePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    type: "ebook" as "ebook" | "course" | "saas",
    imageUrl: "",
    fileUrl: "",
    audioUrl: "",
    duration: "",
    pages: "",
    published: true,
  });

  const [fileMode, setFileMode] = useState<"url" | "upload">("url");
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");

  const [courseContent, setCourseContent] = useState([{ title: "", videoUrl: "" }]);

  async function generateDescription() {
    if (!form.title) {
      setError("Please enter a title first to generate a description.");
      return;
    }
    
    setError("");
    setGeneratingAi(true);
    
    try {
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          price: form.price,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      
      setForm((prev) => ({ ...prev, description: data.description }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate AI description.");
    } finally {
      setGeneratingAi(false);
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          duration: form.duration || undefined,
          pages: form.pages ? parseInt(form.pages) : undefined,
          courseContent: form.type === "course" ? courseContent : undefined,
          imageUrl: form.imageUrl || undefined,
          fileUrl: form.fileUrl || undefined,
          audioUrl: form.audioUrl || undefined,
          published: form.published,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Header ── */}
      <div className="mb-8">
        <Link href="/dashboard" className="group flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-amber-600 transition-colors">
          <svg className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
        <div className="mt-4">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Create Product</h1>
          <p className="mt-2 text-zinc-500">
            Sell an ebook, course, or SaaS tool. Looking to start a paid community instead?{" "}
            <Link href="/channel/new" className="font-medium text-amber-600 hover:underline">
              Create a community
            </Link>
            .
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
          <svg className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-rose-800">{error}</p>
        </div>
      )}

      {/* ── Product Form ── */}
      <form onSubmit={handleCreateProduct} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* ── Main Form Column (Left) ── */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Basic Information */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
                <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Basic Details
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-zinc-700">Product Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Advanced Next.js Masterclass"
                  required
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50/50 px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-zinc-700">Description <span className="text-rose-500">*</span></label>
                  <button
                    type="button"
                    onClick={generateDescription}
                    disabled={generatingAi || !form.title}
                    className="group flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-1 text-xs font-semibold text-amber-700 hover:from-amber-200 hover:to-orange-200 disabled:opacity-50 transition-all"
                  >
                    {generatingAi ? (
                      <span className="flex items-center gap-1.5"><span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" /> Generating...</span>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        Write with AI
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe what your product is about..."
                  required
                  rows={6}
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50/50 px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700">Product Type</label>
                  <div className="relative mt-2">
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as "ebook" | "course" | "saas" })}
                      className="w-full appearance-none rounded-xl border border-zinc-300 bg-zinc-50/50 px-4 py-3 text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all cursor-pointer"
                    >
                      <option value="ebook">📚 Ebook</option>
                      <option value="course">🎓 Video Course</option>
                      <option value="saas">🛠️ SaaS / Software</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-700">Price (USD) <span className="text-rose-500">*</span></label>
                  <div className="relative mt-2">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500 font-medium">$</div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="0.00"
                      required
                      className="w-full rounded-xl border border-zinc-300 bg-zinc-50/50 pl-8 pr-4 py-3 text-zinc-900 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic metadata based on type */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {form.type === "course" && (
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700">Total Duration</label>
                    <input
                      type="text"
                      placeholder="e.g. 5 hours 30 mins"
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50/50 px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                    />
                  </div>
                )}
                {form.type === "ebook" && (
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700">Page Count</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 120"
                      value={form.pages}
                      onChange={(e) => setForm({ ...form, pages: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-zinc-300 bg-zinc-50/50 px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Media & Files */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
                <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L28 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Media & Delivery
              </h2>
            </div>
            <div className="p-6 space-y-8">
              
              {/* Cover Image */}
              <div className="rounded-xl border border-zinc-200 p-5 bg-zinc-50/30">
                <label className="block text-sm font-semibold text-zinc-900">Cover Image</label>
                <p className="mt-1 text-xs text-zinc-500">This image will represent your product in the marketplace.</p>
                
                <div className="mt-4 flex gap-4 border-b border-zinc-200 pb-4">
                  <button type="button" onClick={() => setImageMode('url')} className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${imageMode === 'url' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> External Link
                  </button>
                  <button type="button" onClick={() => setImageMode('upload')} className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${imageMode === 'upload' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Direct Upload
                  </button>
                </div>

                <div className="mt-4 flex gap-4">
                  <div className="flex-1">
                    {imageMode === "url" ? (
                      <input
                        type="url"
                        value={form.imageUrl}
                        onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                        placeholder="https://example.com/cover.jpg"
                        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                      />
                    ) : (
                      <div className="relative group rounded-xl border-2 border-dashed border-zinc-300 bg-white hover:border-amber-400 hover:bg-amber-50/50 transition-colors p-4 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const url = await uploadFile(file, "image");
                              setForm((prev) => ({ ...prev, imageUrl: url }));
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Image upload failed");
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <svg className="mx-auto h-6 w-6 text-zinc-400 group-hover:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L28 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="mt-2 text-xs font-medium text-zinc-900">Click or drag image to upload</p>
                      </div>
                    )}
                  </div>
                  {form.imageUrl && (
                    <div className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border border-zinc-200 shadow-sm bg-zinc-100 flex items-center justify-center">
                      <img key={form.imageUrl} src={form.imageUrl} alt="Preview" className="h-full w-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L28 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E"; }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Main Delivery File or Course Builder */}
              {form.type === "course" ? (
                <div className="rounded-xl border border-amber-200 p-5 bg-amber-50/30">
                  <label className="block text-sm font-semibold text-zinc-900">Course Curriculum (Video Modules)</label>
                  <p className="mt-1 text-xs text-zinc-500">Add video lessons for your students. Add titles and video URLs.</p>
                  
                  <div className="mt-4 space-y-4">
                    {courseContent.map((module, index) => (
                      <div key={index} className="flex gap-4 items-start bg-white p-4 rounded-xl border border-zinc-200 shadow-sm relative group">
                        {courseContent.length > 1 && (
                          <button type="button" onClick={() => {
                            const newModules = [...courseContent];
                            newModules.splice(index, 1);
                            setCourseContent(newModules);
                          }} className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-zinc-400 hover:text-rose-500 shadow-sm border border-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-100 text-amber-700 font-bold text-sm shrink-0 mt-1">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <input
                              type="text"
                              value={module.title}
                              onChange={(e) => {
                                const newModules = [...courseContent];
                                newModules[index].title = e.target.value;
                                setCourseContent(newModules);
                              }}
                              placeholder="Module Title (e.g. 1. Introduction to React)"
                              required
                              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                          <div>
                            <input
                              type="url"
                              value={module.videoUrl}
                              onChange={(e) => {
                                const newModules = [...courseContent];
                                newModules[index].videoUrl = e.target.value;
                                setCourseContent(newModules);
                              }}
                              placeholder="Video URL (e.g. YouTube, Vimeo, or MP4 link)"
                              required
                              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCourseContent([...courseContent, { title: "", videoUrl: "" }])}
                      className="w-full py-3 border-2 border-dashed border-amber-300 rounded-xl text-amber-600 font-semibold text-sm hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add Another Module
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 p-5 bg-zinc-50/30">
                  <label className="block text-sm font-semibold text-zinc-900">Delivery Content (PDF / Link)</label>
                  <p className="mt-1 text-xs text-zinc-500">This is what the buyer receives after purchase.</p>
                  
                  <div className="mt-4 flex gap-4 border-b border-zinc-200 pb-4">
                    <button type="button" onClick={() => setFileMode('url')} className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${fileMode === 'url' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> External Link
                    </button>
                    <button type="button" onClick={() => setFileMode('upload')} className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${fileMode === 'upload' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Direct Upload
                    </button>
                  </div>

                  <div className="mt-4">
                    {fileMode === "url" ? (
                      <input
                        type="url"
                        value={form.fileUrl}
                        onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                      />
                    ) : (
                      <div className="relative group rounded-xl border-2 border-dashed border-zinc-300 bg-white hover:border-amber-400 hover:bg-amber-50/50 transition-colors p-6 text-center">
                        <input
                          type="file"
                          accept=".pdf,.zip,.mp4"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const url = await uploadFile(file, "product");
                              setForm((prev) => ({ ...prev, fileUrl: url }));
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "File upload failed");
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <svg className="mx-auto h-8 w-8 text-zinc-400 group-hover:text-amber-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="mt-2 text-sm font-medium text-zinc-900">Click to upload or drag and drop</p>
                        <p className="text-xs text-zinc-500 mt-1">PDF, ZIP, or MP4 up to 50MB</p>
                      </div>
                    )}
                    {form.fileUrl && !form.fileUrl.startsWith("http") && !form.fileUrl.startsWith("data:") && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 border border-green-200">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        File uploaded successfully
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ── Sidebar (Right) ── */}
        <div className="space-y-8">
          {/* Publish Settings Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden sticky top-24">
            <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
                <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Publishing
              </h2>
            </div>
            
            <div className="p-6">
              <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50/50 mb-6 flex items-start gap-3">
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    id="published"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                    className="h-5 w-5 rounded border-zinc-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label htmlFor="published" className="text-sm font-semibold text-zinc-900 cursor-pointer">
                    Publish Immediately
                  </label>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Make this product visible in the marketplace right after creation. Uncheck to save as draft.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:from-amber-600 hover:to-orange-600 hover:shadow-amber-500/40 focus:outline-none focus:ring-4 focus:ring-amber-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Processing...
                  </>
                ) : (
                  <>
                    <span>Create Product</span>
                    <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
