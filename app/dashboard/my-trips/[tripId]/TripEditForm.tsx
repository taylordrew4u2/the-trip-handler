"use client";

import { useState, useTransition } from "react";
import { updateMyTrip } from "@/app/actions/trips";
import { Field, Input, Textarea } from "@/components/forms/field";

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
  "w-full min-w-0 px-3 py-2.5 min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-600 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-sm";

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
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6 space-y-5">
      <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-950 border-b border-slate-100 pb-4">Trip details</h2>
      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <Field label="TRIP NAME" required>
        <Input
          className={inputClass}
          value={fields.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </Field>

      <Field label="DESTINATION">
        <Input
          className={inputClass}
          value={fields.destination}
          onChange={(e) => set("destination", e.target.value)}
          placeholder="Where are you going?"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="START DATE">
          <Input type="date" className={inputClass} value={fields.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="END DATE">
          <Input type="date" className={inputClass} value={fields.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </Field>
      </div>

      <Field label="DESCRIPTION">
        <Textarea
          className={`${inputClass} min-h-[80px]`}
          value={fields.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What's the trip about? Shown on the invite page."
        />
      </Field>

      <Field label="ITINERARY NOTES">
        <Textarea
          className={`${inputClass} min-h-[80px]`}
          value={fields.itinerary}
          onChange={(e) => set("itinerary", e.target.value)}
          placeholder="Rough plan, day by day."
        />
      </Field>

      <Field label="LODGING NOTES">
        <Textarea
          className={`${inputClass} min-h-[60px]`}
          value={fields.lodging}
          onChange={(e) => set("lodging", e.target.value)}
          placeholder="Where everyone's staying."
        />
      </Field>

      <Field label="MEALS NOTES">
        <Textarea
          className={`${inputClass} min-h-[60px]`}
          value={fields.meals}
          onChange={(e) => set("meals", e.target.value)}
          placeholder="Food plan, who's cooking, etc."
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center w-full sm:w-auto px-5 min-h-[44px] rounded-xl bg-indigo-600 transition-colors hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span role="status" className="text-sm text-green-700">
            Saved.
          </span>
        )}
      </div>
    </form>
  );
}
