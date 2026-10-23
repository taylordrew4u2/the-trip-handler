"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinMyTripAsGuest } from "@/app/actions/trips";

/** Lets the owner come on their own trip, so they can switch to guest view. */
export function JoinAsGuestButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError("");
            const result = await joinMyTripAsGuest(tripId);
            if ("error" in result && result.error) setError(result.error);
            else router.push("/dashboard");
          })
        }
        className="inline-flex items-center justify-center min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
      >
        {isPending ? "Joining…" : "I'm going too — join as a guest"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
