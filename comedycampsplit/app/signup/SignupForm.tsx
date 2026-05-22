"use client";

import { useState } from "react";
import { signupAction } from "@/app/actions/auth";
import Link from "next/link";

interface TripOption {
  id: string;
  name: string;
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

export function SignupForm({ trips }: { trips: TripOption[] }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tripId, setTripId] = useState<string>(trips[0]?.id ?? "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    if (!formData.get("tripId")) formData.set("tripId", tripId);
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
      <div className="w-full max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-3">Account created</p>
        <h1 className="font-serif text-3xl font-medium text-stone-900 mb-3">
          One more step.
        </h1>
        <p className="text-stone-600 mb-8 leading-relaxed">
          Sign in and complete the <strong>guest form</strong> — admin reviews this before
          approving you for the trip. We&apos;ll email you once you&apos;re in.
        </p>
        <Link
          href="/login"
          className="inline-block px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Sign in to continue
        </Link>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-7 text-center">
        <p className="text-sm text-stone-700">
          No trips are accepting applications right now. Check back later.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-stone-200 p-7">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset>
            <legend className="block text-xs font-medium text-stone-700 mb-2 tracking-wide">
              WHICH TRIP? *
            </legend>
            <div className="space-y-2">
              {trips.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    tripId === t.id
                      ? "border-stone-900 bg-stone-50"
                      : "border-stone-300 hover:bg-stone-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="tripId"
                    value={t.id}
                    checked={tripId === t.id}
                    onChange={() => setTripId(t.id)}
                    className="mt-0.5 accent-stone-900"
                    required
                  />
                  <span className="text-sm">
                    <span className="block font-medium text-stone-900">{t.name}</span>
                    <span className="block text-xs text-stone-500 mt-0.5">
                      {[t.destination, dateLabel(t.startDate, t.endDate)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
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
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? "Submitting…" : "Apply for trip"}
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
