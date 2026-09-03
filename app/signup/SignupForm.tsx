"use client";

import { useState } from "react";
import { signupAction } from "@/app/actions/auth";
import Link from "next/link";

interface InviteInfo {
  token: string;
  tripName: string;
  destination: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
}

function dateLabel(start: Date | string | null, end: Date | string | null): string {
  const fmt = (d: Date | string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return fmt(start);
  if (end) return fmt(end);
  return "Dates TBD";
}

/**
 * Account creation. In invite mode (an `invite` is passed) the new account is
 * tied to that trip as an application. Without an invite it's a plain account
 * the person can use to host their own trips or apply later via a link.
 */
export function SignupForm({ invite }: { invite?: InviteInfo | null }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    if (invite) formData.set("inviteToken", invite.token);
    const result = await signupAction(formData);
    setLoading(false);
    if (result.error) setError(result.error);
    else setSuccess(true);
  }

  if (success) {
    return (
      <div className="w-full max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-3">Account created</p>
        <h1 className="font-serif text-3xl font-medium text-stone-900 mb-3">
          {invite ? "One more step." : "You're all set."}
        </h1>
        <p className="text-stone-600 mb-8 leading-relaxed">
          {invite ? (
            <>
              Sign in and complete the <strong>guest form</strong> — the trip&apos;s organizer
              reviews this before approving you. We&apos;ll email you once you&apos;re in.
            </>
          ) : (
            <>
              Sign in to <strong>host your own trip</strong>{" "}and invite people, or apply to a
              trip you&apos;ve been invited to.
            </>
          )}
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-5 min-h-[48px] bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Sign in to continue
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-7">
        {invite && (
          <div className="mb-5 rounded-lg border border-stone-900 bg-stone-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-stone-500">You&apos;re applying to</p>
            <p className="text-sm font-medium text-stone-900 mt-0.5">{invite.tripName}</p>
            <p className="text-xs text-stone-500 mt-0.5">
              {[invite.destination, dateLabel(invite.startDate, invite.endDate)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        )}

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">NAME *</label>
              <input
                name="name"
                required
                minLength={2}
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">USERNAME</label>
              <input
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
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
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
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
              autoComplete="new-password"
              enterKeyHint="next"
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">PHONE</label>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              enterKeyHint="go"
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
              placeholder="Optional"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center w-full min-h-[48px] px-4 bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? "Submitting…" : invite ? `Apply to ${invite.tripName}` : "Create account"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link href="/login" className="text-stone-900 font-medium underline underline-offset-2 decoration-stone-300 hover:decoration-stone-900">
          Sign in
        </Link>
      </p>
    </>
  );
}
