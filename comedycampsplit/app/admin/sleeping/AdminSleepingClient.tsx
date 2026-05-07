"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addBed, deleteBed, adminUnassignBed } from "@/app/actions/sleeping";

interface BedRow {
  id: string;
  label: string;
  room: string | null;
  type: "SINGLE" | "DOUBLE";
  womenOnly: boolean;
  assignments: {
    userId: string;
    user: { id: string; name: string; username: string | null };
  }[];
}

export function AdminSleepingClient({ tripId, beds }: { tripId: string; beds: BedRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<"SINGLE" | "DOUBLE">("DOUBLE");
  const [error, setError] = useState("");

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.append("tripId", tripId);
    const result = await addBed(fd);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setShowForm(false);
    (e.target as HTMLFormElement).reset();
    setType("DOUBLE");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this bed and unassign anyone in it?")) return;
    await deleteBed(id);
    router.refresh();
  }

  async function handleUnassign(userId: string, name: string) {
    if (!confirm(`Remove ${name} from their bed?`)) return;
    await adminUnassignBed(userId);
    router.refresh();
  }

  if (!tripId) {
    return <p className="text-sm text-stone-500">No trip yet — create one first.</p>;
  }

  // Group by room
  const grouped = beds.reduce<Record<string, BedRow[]>>((acc, bed) => {
    const key = bed.room || "Unassigned room";
    (acc[key] ??= []).push(bed);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <button
        onClick={() => setShowForm(!showForm)}
        className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800"
      >
        {showForm ? "Cancel" : "+ Add bed"}
      </button>

      {showForm && (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h3 className="font-medium text-stone-900 mb-4">New bed</h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">LABEL *</label>
                <input
                  name="label"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                  placeholder="e.g. Bed 1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">ROOM</label>
                <input
                  name="room"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                  placeholder="e.g. Master bedroom"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">TYPE</label>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="type" value="DOUBLE" checked={type === "DOUBLE"} onChange={() => setType("DOUBLE")} />
                  Double (2 slots)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="type" value="SINGLE" checked={type === "SINGLE"} onChange={() => setType("SINGLE")} />
                  Single (1 slot, women-only)
                </label>
              </div>
            </div>
            {type === "DOUBLE" && (
              <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                <input type="checkbox" name="womenOnly" />
                Mark this double as women-only
              </label>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Add bed"}
            </button>
          </form>
        </div>
      )}

      {Object.entries(grouped).length === 0 && (
        <p className="text-stone-500 text-sm">No beds yet. Add one above to get started.</p>
      )}

      {Object.entries(grouped).map(([room, roomBeds]) => (
        <section key={room} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <h3 className="font-medium text-stone-900 px-5 pt-4 pb-3 border-b border-stone-200">{room}</h3>
          <div className="divide-y divide-stone-100">
            {roomBeds.map((bed) => {
              const capacity = bed.type === "DOUBLE" ? 2 : 1;
              return (
                <div key={bed.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-900">{bed.label}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                          {bed.type === "DOUBLE" ? "Double · 2 slots" : "Single · 1 slot"}
                        </span>
                        {bed.womenOnly && (
                          <span className="text-xs px-2 py-0.5 rounded bg-pink-100 text-pink-900 font-medium">
                            Women only
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-700 tabular-nums">
                          {bed.assignments.length}/{capacity} taken
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(bed.id)}
                      className="text-xs px-2.5 py-1 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                  {bed.assignments.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {bed.assignments.map((a) => (
                        <li key={a.userId} className="flex items-center justify-between text-sm">
                          <span className="text-stone-800">
                            {a.user.name}
                            {a.user.username && <span className="text-stone-400"> · @{a.user.username}</span>}
                          </span>
                          <button
                            onClick={() => handleUnassign(a.userId, a.user.name)}
                            className="text-xs text-stone-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
