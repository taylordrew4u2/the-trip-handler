"use client";

import { useState, useTransition } from "react";
import { updateMyTripRosterCapacity } from "@/app/actions/trips";

export function RosterSettingsPanel({ tripId, capacity }: { tripId: string; capacity: number }) {
  const [draft, setDraft] = useState(capacity.toString());
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6 space-y-4">
      <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-950">Roster spots</h2>
      <p className="text-sm text-slate-600">
        Set the number of spots shown on your roster. This does not change the cost split
        or remove approved members. You still choose which applicants to approve.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          setSaved(false);
          startTransition(async () => {
            const result = await updateMyTripRosterCapacity(tripId, Number(draft));
            if (result.error) setError(result.error);
            else setSaved(true);
          });
        }}
      >
        <label className="text-sm text-slate-700">
          Number of roster spots
          <input
            type="number"
            min="1"
            max="1000"
            step="1"
            required
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setSaved(false); }}
            disabled={pending}
            className="mt-1 block w-32 min-h-[44px] rounded-xl border border-slate-300 px-3 text-slate-900"
          />
        </label>
        <button type="submit" disabled={pending}
          className="min-h-[44px] rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save roster spots"}
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {saved && <p role="status" className="text-sm text-green-700">Roster spots saved.</p>}
    </section>
  );
}
