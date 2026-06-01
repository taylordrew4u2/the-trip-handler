"use client";

import { useState } from "react";
import { requestAdminAccess } from "@/app/actions/adminAccess";

export default function RequestAdminPage() {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    const result = await requestAdminAccess(formData);
    setLoading(false);
    if (result?.error) setError(result.error);
    else setDone(true);
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Admin</p>
          <h1 className="font-serif text-3xl font-medium text-stone-100">Request access</h1>
          <p className="text-xs text-stone-500 italic mt-3 leading-snug">
            An existing admin reviews every request before access is granted.
          </p>
        </div>

        <div className="bg-stone-900 rounded-xl border border-stone-800 p-7">
          {done ? (
            <div className="text-center space-y-3">
              <p className="text-stone-100 text-sm font-medium">Request submitted.</p>
              <p className="text-stone-400 text-sm leading-relaxed">
                We&apos;ve let the current admins know. Once someone approves you,
                you&apos;ll get an email and can sign in on the admin page.
              </p>
              <a href="/admin" className="inline-block text-xs text-stone-400 hover:text-stone-200 mt-2">
                ← Back to admin sign-in
              </a>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-950/50 border border-red-900 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">
                  {error}
                </div>
              )}

              <form action={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5 tracking-wide">NAME</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 text-sm"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5 tracking-wide">EMAIL</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-3 py-2.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 text-sm"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5 tracking-wide">PASSWORD</label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    className="w-full px-3 py-2.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 text-sm"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-stone-100 hover:bg-white text-stone-900 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? "Submitting…" : "Request admin access"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-stone-500">
          <a href="/admin" className="hover:text-stone-300">← Admin sign-in</a>
        </p>
      </div>
    </div>
  );
}
