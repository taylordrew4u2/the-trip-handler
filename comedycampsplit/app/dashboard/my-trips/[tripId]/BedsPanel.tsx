"use client";

import { useState, useTransition } from "react";
import { addTripBed, deleteTripBed, seedDefaultTripBeds } from "@/app/actions/trips";

type Bed = {
  id: string;
  label: string;
  room: string | null;
  type: "SINGLE" | "DOUBLE";
  womenOnly: boolean;
  occupants: string[];
};

export function BedsPanel({ tripId, beds }: { tripId: string; beds: Bed[] }) {
  const [label, setLabel] = useState("");
  const [room, setRoom] = useState("");
  const [type, setType] = useState<"SINGLE" | "DOUBLE">("DOUBLE");
  const [womenOnly, setWomenOnly] = useState(false);
  const [count, setCount] = useState("1");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string } | void>, after?: () => void) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) setError(result.error);
      else after?.();
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    run(
      () => addTripBed(tripId, { label, room: room || undefined, type, womenOnly, count: Number(count) || 1 }),
      () => {
        setLabel("");
        setRoom("");
        setCount("1");
        setWomenOnly(false);
      },
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
      <div>
        <h2 className="font-serif text-xl font-medium text-stone-900">Beds</h2>
        <p className="text-stone-500 text-sm mt-1">
          Set up the sleeping layout. Participants claim beds on the trip dashboard.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
      )}

      {beds.length === 0 && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => seedDefaultTripBeds(tripId))}
          className="px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-sm font-medium disabled:opacity-50"
        >
          Start with a default bedroom layout
        </button>
      )}

      <form onSubmit={add} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Queen)"
          className="col-span-2 px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900"
        />
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="Room"
          className="px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900"
        />
        <input
          type="number"
          min="1"
          max="20"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          title="How many"
          className="px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "SINGLE" | "DOUBLE")}
          className="px-3 py-2 rounded-lg border border-stone-300 text-sm bg-white focus:outline-none focus:border-stone-900"
        >
          <option value="DOUBLE">Double (2)</option>
          <option value="SINGLE">Single (1)</option>
        </select>
        <label className="flex items-center gap-2 text-xs text-stone-600">
          <input type="checkbox" checked={womenOnly} onChange={(e) => setWomenOnly(e.target.checked)} className="accent-stone-900" />
          Women only
        </label>
        <button
          type="submit"
          disabled={isPending || !label.trim()}
          className="col-span-2 sm:col-span-1 px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium disabled:opacity-50"
        >
          Add bed
        </button>
      </form>

      {beds.length > 0 && (
        <ul className="space-y-2">
          {beds.map((bed) => (
            <li key={bed.id} className="flex items-center justify-between gap-3 border border-stone-100 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {bed.label}
                  {bed.room && <span className="ml-2 text-xs text-stone-400">{bed.room}</span>}
                  <span className="ml-2 text-xs text-stone-400">
                    {bed.type === "SINGLE" ? "single" : "double"}
                    {bed.womenOnly ? " · women only" : ""}
                  </span>
                </p>
                <p className="text-xs text-stone-500 truncate">
                  {bed.occupants.length > 0 ? bed.occupants.join(", ") : "Empty"}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (confirm(`Delete "${bed.label}"? Anyone in it will be unassigned.`)) run(() => deleteTripBed(bed.id));
                }}
                className="px-2.5 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
