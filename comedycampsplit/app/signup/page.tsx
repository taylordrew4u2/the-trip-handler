"use client";

import { useState } from "react";
import { signupAction } from "@/app/actions/auth";
import Link from "next/link";

export default function SignupPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const result = await signupAction(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-3">Submitted</p>
          <h1 className="font-serif text-3xl font-medium text-stone-900 mb-3">
            You&apos;re on the list.
          </h1>
          <p className="text-stone-600 mb-8">
            Your application is awaiting admin approval. We&apos;ll email you as soon as you&apos;re in.
          </p>
          <Link
            href="/login"
            className="inline-block px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Apply</p>
            <h1 className="font-serif text-4xl font-medium text-stone-900 leading-tight">
              Comedy<br />Summer Camp
            </h1>
          </Link>
          <p className="text-stone-600 mt-4 text-sm">Tell us about yourself — admin will approve shortly.</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-7">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">NAME *</label>
                <input
                  name="name"
                  required
                  minLength={2}
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">USERNAME</label>
                <input
                  name="username"
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
                  placeholder="@handle"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">EMAIL *</label>
              <input
                name="email"
                type="email"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">PASSWORD *</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">PHONE</label>
              <input
                name="phone"
                type="tel"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">COMEDY BIO</label>
              <textarea
                name="bio"
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm resize-none"
                placeholder="Your style, a one-liner, anything…"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "Submitting…" : "Apply for camp"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-stone-600">
          Already have an account?{" "}
          <Link href="/login" className="text-stone-900 font-medium underline underline-offset-2 decoration-stone-300 hover:decoration-stone-900">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
