"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addContribution } from "@/app/actions/contributions";

export function AddContributionForm({
  tripId,
  userId,
}: {
  tripId: string;
  userId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.append("tripId", tripId);
    formData.append("creatorUserId", userId);
    const result = await addContribution(formData);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800"
      >
        + Add what you&apos;re bringing
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6">
      <h3 className="font-medium text-stone-900 mb-4">What are you bringing?</h3>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">TITLE *</label>
            <input
              name="title"
              required
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
              placeholder="e.g. Bluetooth speaker"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">CATEGORY</label>
            <input
              name="category"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
              placeholder="e.g. Gear"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">DESCRIPTION</label>
          <input
            name="description"
            className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
            placeholder="Optional details"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add it"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
