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
      <p className="text-sm text-stone-500 text-center">
        This is your own trip — share the invite link with the people you want to come.
      </p>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-stone-900">You&apos;ve applied.</p>
        <p className="text-sm text-stone-500">
          The organizer reviews applications and you&apos;ll hear back by email.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-2 inline-block px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-medium"
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
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}
      <button
        onClick={apply}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
      >
        {loading ? "Applying…" : "Apply to this trip"}
      </button>
    </div>
  );
}
