"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { claimBedSlot, leaveBedSlot, bumpFromSingle } from "@/app/actions/sleeping";

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

export function SleepingClient({
  beds,
  userId,
  myGender,
}: {
  beds: BedRow[];
  userId: string;
  myGender: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isFemale = myGender === "female";
  const genderUnset = myGender === null;

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

  async function handleBump(bedId: string, occupantName: string) {
    setError("");
    if (
      !confirm(
        `Take ${occupantName}'s single bed? They'll be moved out and emailed to pick another spot.`
      )
    )
      return;
    setBusy(bedId + "bump");
    const result = await bumpFromSingle(bedId);
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
  const myBed = beds.find((b) => b.id === myBedId);

  const totalSlots = beds.reduce((n, b) => n + (b.type === "DOUBLE" ? 2 : 1), 0);
  const takenSlots = beds.reduce((n, b) => n + b.assignments.length, 0);
  const openSlots = totalSlots - takenSlots;

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

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-stone-600">
          <span className="font-semibold text-stone-900 tabular-nums">{openSlots}</span> of{" "}
          <span className="tabular-nums">{totalSlots}</span> slots still open
        </span>
        {takenSlots > 0 && (
          <div className="flex-1 max-w-xs h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-stone-900 rounded-full transition-all"
              style={{ width: `${(takenSlots / totalSlots) * 100}%` }}
            />
          </div>
        )}
      </div>

      {genderUnset && (
        <p className="text-xs text-stone-500">
          Tip: set your{" "}
          <a href="/dashboard/profile" className="underline underline-offset-2 hover:text-stone-900">
            profile gender
          </a>{" "}
          to female if you want to be able to claim a single bed from its current occupant.
        </p>
      )}

      {myBed && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-900">
              You&apos;re in <strong>{myBed.label}</strong>
              {myBed.room && <span className="font-normal text-emerald-700"> · {myBed.room}</span>}
            </p>
            {myBed.type === "DOUBLE" && (
              <p className="text-xs text-emerald-700 mt-0.5">
                Double bed · {myBed.assignments.length}/2 slots taken
              </p>
            )}
          </div>
          <button
            onClick={handleLeave}
            disabled={busy !== null}
            className="text-xs px-3 py-1.5 border border-emerald-700 text-emerald-900 rounded-md hover:bg-emerald-100 disabled:opacity-50 whitespace-nowrap"
          >
            {busy === "leave" ? "Leaving…" : "Leave bed"}
          </button>
        </div>
      )}

      {Object.entries(grouped).map(([room, roomBeds]) => {
        const roomCapacity = roomBeds.reduce((n, b) => n + (b.type === "DOUBLE" ? 2 : 1), 0);
        const roomTaken = roomBeds.reduce((n, b) => n + b.assignments.length, 0);
        const roomFull = roomTaken >= roomCapacity;
        return (
        <section key={room} className={`bg-white border rounded-xl overflow-hidden ${roomFull ? "border-stone-100 opacity-60" : "border-stone-200"}`}>
          <div className="px-5 pt-4 pb-3 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-medium text-stone-900">{room}</h3>
            <span className={`text-xs px-2 py-0.5 rounded tabular-nums ${roomFull ? "bg-stone-100 text-stone-500" : "bg-stone-100 text-stone-700"}`}>
              {roomTaken}/{roomCapacity}
            </span>
          </div>
          <div className="divide-y divide-stone-100">
            {roomBeds.map((bed) => {
              const capacity = bed.type === "DOUBLE" ? 2 : 1;
              const taken = bed.assignments.length;
              const full = taken >= capacity;
              const mine = bed.assignments.some((a) => a.userId === userId);
              const isOccupiedSingle = bed.type === "SINGLE" && taken > 0 && !mine;
              const occupant = bed.assignments[0];
              const canBump = isOccupiedSingle && isFemale;
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
                    ) : canBump ? (
                      <button
                        onClick={() => handleBump(bed.id, occupant?.user.name ?? "the occupant")}
                        disabled={busy !== null}
                        className="text-xs px-3 py-1.5 border border-stone-700 text-stone-900 rounded-md font-medium hover:bg-stone-100 disabled:opacity-50"
                        title="Female members can take a single from a current occupant"
                      >
                        {busy === bed.id + "bump" ? "Requesting…" : "Take this single"}
                      </button>
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
        );
      })}
    </div>
  );
}
