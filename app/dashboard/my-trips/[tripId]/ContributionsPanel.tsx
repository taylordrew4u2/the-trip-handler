"use client";

import { useState, useTransition } from "react";
import { addTripContribution, deleteTripContribution } from "@/app/actions/trips";

type Item = { id: string; title: string; category: string | null; claimedBy: string[] };

export function ContributionsPanel({ tripId, items }: { tripId: string; items: Item[] }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
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
    if (!title.trim()) return;
    run(
      () => addTripContribution(tripId, title, undefined, category || undefined),
      () => {
        setTitle("");
        setCategory("");
      },
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="font-serif text-xl font-medium text-stone-900">Contributions</h2>
        <p className="text-stone-500 text-sm mt-1">Items for people to bring. Participants claim them on the trip dashboard.</p>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
      )}

      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_auto] gap-2">
        {/* Compact add-row: placeholders are the visible labels, so the
            accessible name is supplied explicitly. */}
        <input
          aria-label="Item to bring"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Item to bring"
          className="min-w-0 px-3 min-h-[44px] rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
        />
        <input
          aria-label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className="min-w-0 px-3 min-h-[44px] rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
        />
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="inline-flex items-center justify-center px-4 min-h-[44px] rounded-lg bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-white text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-stone-500 text-sm">No contribution items yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 border border-stone-100 rounded-lg px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {item.title}
                  {item.category && <span className="ml-2 text-xs text-stone-500">{item.category}</span>}
                </p>
                <p className="text-xs text-stone-500 truncate">
                  {item.claimedBy.length > 0 ? `Claimed by ${item.claimedBy.join(", ")}` : "Unclaimed"}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (confirm(`Delete "${item.title}"?`)) run(() => deleteTripContribution(item.id));
                }}
                className="inline-flex items-center justify-center shrink-0 px-3 min-h-[32px] rounded-md border border-red-200 text-red-700 hover:bg-red-50 active:bg-red-100 text-xs font-medium disabled:opacity-50"
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
