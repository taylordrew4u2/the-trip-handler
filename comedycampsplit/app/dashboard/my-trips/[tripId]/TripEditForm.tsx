"use client";

import { useState, useTransition } from "react";
import { updateMyTrip } from "@/app/actions/trips";

type Fields = {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string;
  itinerary: string;
  lodging: string;
  meals: string;
};

const inputClass =
  "w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm";

export function TripEditForm({ tripId, initial }: { tripId: string; initial: Fields }) {
  const [fields, setFields] = useState<Fields>(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await updateMyTrip(tripId, fields);
      if (result?.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">TRIP NAME *</label>
        <input
          className={inputClass}
          value={fields.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">DESTINATION</label>
        <input
          className={inputClass}
          value={fields.destination}
          onChange={(e) => set("destination", e.target.value)}
          placeholder="Where are you going?"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">START DATE</label>
          <input type="date" className={inputClass} value={fields.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">END DATE</label>
          <input type="date" className={inputClass} value={fields.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">DESCRIPTION</label>
        <textarea
          className={`${inputClass} min-h-[80px]`}
          value={fields.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What's the trip about? Shown on the invite page."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">ITINERARY NOTES</label>
        <textarea
          className={`${inputClass} min-h-[80px]`}
          value={fields.itinerary}
          onChange={(e) => set("itinerary", e.target.value)}
          placeholder="Rough plan, day by day."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">LODGING NOTES</label>
        <textarea
          className={`${inputClass} min-h-[60px]`}
          value={fields.lodging}
          onChange={(e) => set("lodging", e.target.value)}
          placeholder="Where everyone's staying."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">MEALS NOTES</label>
        <textarea
          className={`${inputClass} min-h-[60px]`}
          value={fields.meals}
          onChange={(e) => set("meals", e.target.value)}
          placeholder="Food plan, who's cooking, etc."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm text-green-700">Saved.</span>}
      </div>
    </form>
  );
}
