"use client";

import { useState, useTransition } from "react";
import {
  approveTripApplicant,
  createMyTrip,
  rejectTripApplicant,
  setMyTripApplicationOpen,
} from "@/app/actions/trips";

type Applicant = { id: string; name: string; email: string; status: string };
type TripData = {
  id: string;
  name: string;
  inviteToken: string | null;
  isApplicationOpen: boolean;
  applicants: Applicant[];
};

function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/join/${token}`;

  async function copy() {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — the link is still selectable below */
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate text-xs bg-stone-100 border border-stone-200 rounded-lg px-3 py-2 text-stone-700">
        {path}
      </code>
      <button
        type="button"
        onClick={copy}
        className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium whitespace-nowrap"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-green-100 text-green-800",
    PENDING_PAYMENT: "bg-blue-100 text-blue-800",
    CONFIRMED_PAID: "bg-green-100 text-green-800",
    CANCELLED: "bg-stone-200 text-stone-600",
  };
  return map[status] ?? "bg-stone-100 text-stone-700";
}

export function MyTripsClient({ trips }: { trips: TripData[] }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string } | void>) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) setError(result.error);
    });
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    run(async () => {
      const result = await createMyTrip(trimmed);
      if (!(result && "error" in result && result.error)) setName("");
      return result;
    });
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="bg-white rounded-xl border border-stone-200 p-5">
        <label className="block text-xs font-medium text-stone-700 mb-2 tracking-wide">
          NAME A NEW TRIP
        </label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cabin weekend in Tahoe"
            className="flex-1 px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
          />
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="px-4 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium disabled:opacity-50 whitespace-nowrap"
          >
            Create trip
          </button>
        </div>
      </form>

      {trips.length === 0 ? (
        <p className="text-stone-400 text-sm">
          You haven&apos;t created any trips yet. Name one above to get an invite link.
        </p>
      ) : (
        <ul className="space-y-5">
          {trips.map((trip) => (
            <li key={trip.id} className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-xl font-medium text-stone-900">{trip.name}</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {trip.applicants.length} applicant{trip.applicants.length === 1 ? "" : "s"}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs text-stone-600 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={trip.isApplicationOpen}
                    disabled={isPending}
                    onChange={(e) =>
                      run(() => setMyTripApplicationOpen(trip.id, e.target.checked))
                    }
                    className="accent-stone-900"
                  />
                  Accepting applications
                </label>
              </div>

              {trip.inviteToken ? (
                <InviteLink token={trip.inviteToken} />
              ) : (
                <p className="text-xs text-stone-400">No invite link on this trip.</p>
              )}

              <div>
                <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide mb-2">
                  Applicants
                </p>
                {trip.applicants.length === 0 ? (
                  <p className="text-stone-400 text-sm">No one has applied yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {trip.applicants.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-3 border border-stone-100 rounded-lg px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-900 truncate">{a.name}</p>
                          <p className="text-xs text-stone-500 truncate">{a.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusBadge(a.status)}`}>
                            {a.status.replace("_", " ").toLowerCase()}
                          </span>
                          {a.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => run(() => approveTripApplicant(a.id))}
                                className="px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => run(() => rejectTripApplicant(a.id))}
                                className="px-2.5 py-1 rounded-md border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-medium disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
