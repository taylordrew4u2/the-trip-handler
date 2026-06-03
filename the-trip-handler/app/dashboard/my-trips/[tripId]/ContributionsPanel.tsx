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
    <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
      <div>
        <h2 className="font-serif text-xl font-medium text-stone-900">Contributions</h2>
        <p className="text-stone-500 text-sm mt-1">Items for people to bring. Participants claim them on the trip dashboard.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
      )}

      <form onSubmit={add} className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Item to bring"
          className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className="w-32 px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
        />
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-stone-400 text-sm">No contribution items yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 border border-stone-100 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {item.title}
                  {item.category && <span className="ml-2 text-xs text-stone-400">{item.category}</span>}
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
