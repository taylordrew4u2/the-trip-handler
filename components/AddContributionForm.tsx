"use client";

import { useId, useState } from "react";
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
  const formId = useId();

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
        className="min-w-[44px] inline-flex items-center justify-center px-4 min-h-[44px] bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 active:bg-indigo-800"
      >
        + Add what you&apos;re bringing
      </button>
    );
  }

  return (
    <div className="min-w-0 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6">
      <h3 className="font-serif text-xl font-medium text-slate-950 mb-4">What are you bringing?</h3>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-title`} className="block text-xs font-medium text-slate-700 mb-1.5 tracking-wide">TITLE *</label>
            <input
              id={`${formId}-title`}
              name="title"
              required
              className="w-full min-h-[44px] px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
              placeholder="e.g. Bluetooth speaker"
            />
          </div>
          <div>
            <label htmlFor={`${formId}-category`} className="block text-xs font-medium text-slate-700 mb-1.5 tracking-wide">CATEGORY</label>
            <input
              id={`${formId}-category`}
              name="category"
              className="w-full min-h-[44px] px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
              placeholder="e.g. Gear"
            />
          </div>
        </div>
        <div>
          <label htmlFor={`${formId}-description`} className="block text-xs font-medium text-slate-700 mb-1.5 tracking-wide">DESCRIPTION</label>
          <input
            id={`${formId}-description`}
            name="description"
            className="w-full min-h-[44px] px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
            placeholder="Optional details"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="min-w-[44px] min-h-[44px] px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add it"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-w-[44px] min-h-[44px] px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
