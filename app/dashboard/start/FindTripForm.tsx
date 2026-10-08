"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { findTripByCode } from "@/app/actions/trips";

export function FindTripForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setError("");
    startTransition(async () => {
      const result = await findTripByCode(trimmed);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("token" in result && result.token) {
        // Hand off to the normal apply flow so the owner still approves.
        router.push(`/join/${result.token}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. K7P4QX"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
          aria-label="Trip code"
          enterKeyHint="go"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 font-mono text-base uppercase tracking-widest text-slate-900 placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-600 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15"
        />
        <button
          type="submit"
          disabled={isPending || !code.trim()}
          className="inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50"
        >
          {isPending ? "Searching…" : "Find trip"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
