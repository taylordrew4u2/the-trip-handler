"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { unlockGuestForm } from "@/app/actions/guestForm";

export function UnlockFormButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Unlock this guest form? The user will be able to edit and resubmit it.")) return;
    setLoading(true);
    const result = await unlockGuestForm(userId);
    setLoading(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-md font-medium disabled:opacity-50"
      type="button"
    >
      {loading ? "Unlocking…" : "Unlock for edits"}
    </button>
  );
}
