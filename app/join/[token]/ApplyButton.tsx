"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyToTrip } from "@/app/actions/trips";

export function ApplyButton({ token, ownTrip }: { token: string; ownTrip: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (ownTrip) {
    return (
      <p className="text-sm text-slate-600 text-center">
        This is your own trip — share the invite link with the people you want to come.
      </p>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-slate-950">You&apos;ve applied.</p>
        <p className="text-sm text-slate-600">
          The organizer reviews applications and you&apos;ll hear back by email.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center justify-center mt-2 px-5 min-h-[48px] bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-medium"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  async function apply() {
    setLoading(true);
    setError("");
    const result = await applyToTrip(token);
    setLoading(false);
    if (result?.error) setError(result.error);
    else {
      setDone(true);
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">
          {error}
        </div>
      )}
      <button
        onClick={apply}
        disabled={loading}
        className="inline-flex items-center justify-center w-full min-h-[48px] px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
      >
        {loading ? "Applying…" : "Apply to this trip"}
      </button>
    </div>
  );
}
