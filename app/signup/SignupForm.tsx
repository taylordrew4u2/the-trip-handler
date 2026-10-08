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
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <span aria-hidden="true" className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl bg-indigo-50 text-xl text-indigo-700">✓</span>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">Account created</p>
        <h2 className="mb-3 font-serif text-3xl font-medium text-slate-950">
          {invite ? "One more step." : "You're all set."}
        </h2>
        <p className="text-slate-600 mb-8 leading-relaxed">
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
          className="inline-flex items-center justify-center px-5 min-h-[48px] bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Sign in to continue
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Create your account</h2>
          <p className="mt-1 text-sm text-slate-600">A few details, then you can get started.</p>
        </div>
        {invite && (
          <div className="mb-5 min-w-0 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">You&apos;re applying to</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-950">{invite.tripName}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {[invite.destination, dateLabel(invite.startDate, invite.endDate)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        )}

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="signup-name" className="mb-2 block text-xs font-semibold tracking-wide text-slate-700">NAME *</label>
              <input
                id="signup-name"
                name="name"
                required
                minLength={2}
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-600 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="signup-username" className="mb-2 block text-xs font-semibold tracking-wide text-slate-700">USERNAME</label>
              <input
                id="signup-username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-600 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
                placeholder="@handle"
              />
            </div>
          </div>
          <div>
            <label htmlFor="signup-email" className="mb-2 block text-xs font-semibold tracking-wide text-slate-700">EMAIL *</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-600 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="mb-2 block text-xs font-semibold tracking-wide text-slate-700">PASSWORD *</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              enterKeyHint="next"
              className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-600 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label htmlFor="signup-phone" className="mb-2 block text-xs font-semibold tracking-wide text-slate-700">PHONE</label>
            <input
              id="signup-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              enterKeyHint="go"
              className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-600 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
              placeholder="Optional"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50"
          >
            <span className="min-w-0 break-words">{loading ? "Submitting…" : invite ? `Apply to ${invite.tripName}` : "Create account"}</span>
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="text-slate-950 font-medium underline underline-offset-2 decoration-indigo-200 hover:decoration-indigo-600">
          Sign in
        </Link>
      </p>
    </>
  );
}
