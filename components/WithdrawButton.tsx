"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withdrawSelf } from "@/app/actions/withdraw";

export function WithdrawButton({ canWithdraw }: { canWithdraw: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    if (
      !confirm(
        "Pull out of the trip? Your bed and contributions will be released and your status will be set to CANCELLED. You can come back to admin if you change your mind."
      )
    )
      return;
    setBusy(true);
    setError("");
    const result = await withdrawSelf();
    setBusy(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (!canWithdraw) {
    return (
      <p className="text-xs text-stone-500">
        You&apos;ve already paid — contact admin if you need to drop out.
      </p>
    );
  }

  return (
    <div>
      {error && <p className="text-sm text-red-700 mb-2">{error}</p>}
      <button
        onClick={handleClick}
        disabled={busy}
        type="button"
        className="text-sm px-3 py-1.5 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? "Withdrawing…" : "Pull out of the trip"}
      </button>
    </div>
  );
}
