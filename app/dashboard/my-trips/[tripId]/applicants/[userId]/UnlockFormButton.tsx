"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlockGuestForm } from "@/app/actions/guestForm";

export function UnlockFormButton({ userId, requested }: { userId: string; requested: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError("");
            const result = await unlockGuestForm(userId);
            if (result && "error" in result && result.error) setError(result.error);
            else router.refresh();
          })
        }
        className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-medium disabled:opacity-50 ${
          requested ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
        }`}
      >
        {isPending ? "Unlocking…" : "Unlock for edits"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
