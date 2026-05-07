"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { claimBedSlot, leaveBedSlot } from "@/app/actions/sleeping";

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

export function SleepingClient({ beds, userId }: { beds: BedRow[]; userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleClaim(bedId: string, womenOnly: boolean) {
    setError("");
    if (womenOnly) {
      if (!confirm("This bed is women-only. Confirm you qualify?")) return;
    }
    setBusy(bedId);
    const result = await claimBedSlot(bedId);
    setBusy(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleLeave() {
    setError("");
    setBusy("leave");
    await leaveBedSlot();
    setBusy(null);
    router.refresh();
  }

  if (beds.length === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
        <p className="text-stone-600">Admin hasn&apos;t set up any beds yet. Check back later.</p>
      </div>
    );
  }

  const myBedId = beds.find((b) => b.assignments.some((a) => a.userId === userId))?.id;

  // Group by room
  const grouped = beds.reduce<Record<string, BedRow[]>>((acc, bed) => {
    const key = bed.room || "Unassigned room";
    (acc[key] ??= []).push(bed);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {myBedId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-emerald-900">
            You&apos;re in <strong>{beds.find((b) => b.id === myBedId)?.label}</strong>.
          </p>
          <button
            onClick={handleLeave}
            disabled={busy !== null}
            className="text-xs px-3 py-1.5 border border-emerald-700 text-emerald-900 rounded-md hover:bg-emerald-100 disabled:opacity-50"
          >
            {busy === "leave" ? "Leaving…" : "Leave bed"}
          </button>
        </div>
      )}

      {Object.entries(grouped).map(([room, roomBeds]) => (
        <section key={room} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <h3 className="font-medium text-stone-900 px-5 pt-4 pb-3 border-b border-stone-200">{room}</h3>
          <div className="divide-y divide-stone-100">
            {roomBeds.map((bed) => {
              const capacity = bed.type === "DOUBLE" ? 2 : 1;
              const taken = bed.assignments.length;
              const full = taken >= capacity;
              const mine = bed.assignments.some((a) => a.userId === userId);
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
                          {taken}/{capacity} taken
                        </span>
                      </div>
                    </div>
                    {mine ? (
                      <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-md font-medium">
                        Yours
                      </span>
                    ) : (
                      <button
                        onClick={() => handleClaim(bed.id, bed.womenOnly)}
                        disabled={full || busy !== null}
                        className="text-xs px-3 py-1.5 bg-stone-900 text-white rounded-md font-medium hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed"
                      >
                        {busy === bed.id ? "Claiming…" : full ? "Full" : myBedId ? "Move here" : "Claim"}
                      </button>
                    )}
                  </div>
                  {bed.assignments.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {bed.assignments.map((a) => (
                        <li
                          key={a.userId}
                          className={`text-xs px-2 py-0.5 rounded ${
                            a.userId === userId
                              ? "bg-emerald-100 text-emerald-900 font-medium"
                              : "bg-stone-100 text-stone-700"
                          }`}
                        >
                          {a.user.username ? `@${a.user.username}` : a.user.name}
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
