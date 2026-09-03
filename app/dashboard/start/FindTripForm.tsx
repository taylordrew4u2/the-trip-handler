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
          className="flex-1 min-w-0 px-3 min-h-[48px] rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-base font-mono tracking-widest uppercase placeholder:tracking-normal placeholder:font-sans"
        />
        <button
          type="submit"
          disabled={isPending || !code.trim()}
          className="inline-flex items-center justify-center px-4 min-h-[48px] rounded-lg bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-white text-sm font-medium disabled:opacity-50 whitespace-nowrap"
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
