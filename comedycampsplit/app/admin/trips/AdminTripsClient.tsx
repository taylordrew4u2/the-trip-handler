"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createTrip,
  renameTrip,
  setTripActive,
  setTripApplicationOpen,
  deleteTrip,
} from "@/app/actions/admin";

interface TripRow {
  id: string;
  name: string;
  destination: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  isActive: boolean;
  isApplicationOpen: boolean;
  isLocked: boolean;
  memberCount: number;
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AdminTripsClient({ trips }: { trips: TripRow[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError("");
    const r = await createTrip(newName);
    setCreating(false);
    if (r && "error" in r && r.error) {
      setCreateError(r.error);
      return;
    }
    setNewName("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="bg-white rounded-xl border border-stone-200 p-5 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">
            NEW TRIP NAME
          </label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Spring Trip 2027"
            className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
          />
        </div>
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create trip"}
        </button>
        {createError && (
          <p className="w-full text-xs text-red-700 mt-1">{createError}</p>
        )}
      </form>

      {trips.length === 0 ? (
        <p className="text-sm text-stone-500 italic">No trips yet. Create one above.</p>
      ) : (
        <ul className="space-y-3">
          {trips.map((t) => (
            <TripRowCard key={t.id} trip={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TripRowCard({ trip }: { trip: TripRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(trip.name);
  const [err, setErr] = useState("");

  const dateRange = [fmtDate(trip.startDate), fmtDate(trip.endDate)]
    .filter(Boolean)
    .join(" – ");

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr("");
    const r = (await fn()) as { error?: string } | null | undefined;
    setBusy(false);
    if (r && "error" in r && r.error) {
      setErr(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className="bg-white rounded-xl border border-stone-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {editingName ? (
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="px-2 py-1 rounded border border-stone-300 text-sm font-medium focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                autoFocus
              />
            ) : (
              <h2 className="font-serif text-lg font-medium text-stone-900">{trip.name}</h2>
            )}
            {trip.isActive && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                Active
              </span>
            )}
            {trip.isLocked && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                Locked
              </span>
            )}
            <span
              className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${
                trip.isApplicationOpen
                  ? "bg-blue-100 text-blue-900"
                  : "bg-stone-200 text-stone-700"
              }`}
            >
              {trip.isApplicationOpen ? "Applications open" : "Applications closed"}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {[trip.destination, dateRange].filter(Boolean).join(" · ") || "No destination or dates set"}
          </p>
          <p className="text-xs text-stone-600 mt-1 tabular-nums">
            {trip.memberCount} member{trip.memberCount === 1 ? "" : "s"} attached
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {editingName ? (
            <>
              <button
                onClick={() =>
                  run(async () => {
                    const r = await renameTrip(trip.id, draftName);
                    if (r && !("error" in r)) setEditingName(false);
                    return r;
                  })
                }
                disabled={busy || !draftName.trim()}
                className="text-xs px-3 py-1.5 bg-stone-900 text-white rounded-md hover:bg-stone-800 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setDraftName(trip.name);
                  setErr("");
                }}
                className="text-xs px-3 py-1.5 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditingName(true)}
                className="text-xs px-3 py-1.5 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100"
              >
                Rename
              </button>
              {!trip.isActive && (
                <button
                  onClick={() => run(() => setTripActive(trip.id))}
                  disabled={busy}
                  className="text-xs px-3 py-1.5 border border-emerald-400 text-emerald-900 rounded-md hover:bg-emerald-50 disabled:opacity-50"
                >
                  Make active
                </button>
              )}
              <button
                onClick={() => run(() => setTripApplicationOpen(trip.id, !trip.isApplicationOpen))}
                disabled={busy}
                className="text-xs px-3 py-1.5 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100 disabled:opacity-50"
              >
                {trip.isApplicationOpen ? "Close applications" : "Open applications"}
              </button>
              <Link
                href="/admin/trip"
                className="text-xs px-3 py-1.5 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100"
                title={trip.isActive ? "Edit this trip's details" : "Make this trip active first to edit it"}
              >
                Edit details →
              </Link>
              <button
                onClick={() => {
                  if (!confirm(`Delete "${trip.name}"? This cannot be undone.`)) return;
                  run(() => deleteTrip(trip.id));
                }}
                disabled={busy || trip.memberCount > 0}
                className="text-xs px-3 py-1.5 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-40"
                title={
                  trip.memberCount > 0
                    ? "Members are attached — remove them first"
                    : "Delete this trip"
                }
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      {err && <p className="text-xs text-red-700 mt-2">{err}</p>}
    </li>
  );
}
