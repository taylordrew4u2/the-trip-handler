"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateTrip, lockTrip, unlockTrip } from "@/app/actions/admin";

interface Trip {
  id: string;
  name: string;
  destination: string | null;
  startDate: Date | null;
  endDate: Date | null;
  description: string | null;
  itinerary: string | null;
  lodging: string | null;
  meals: string | null;
  isLocked: boolean;
  finalPrice: number | null;
  totalExpenses: number;
  lockedAt: Date | null;
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900";

export function TripClient({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: trip.name,
    destination: trip.destination ?? "",
    startDate: trip.startDate ? new Date(trip.startDate).toISOString().split("T")[0] : "",
    endDate: trip.endDate ? new Date(trip.endDate).toISOString().split("T")[0] : "",
    description: trip.description ?? "",
    lodging: trip.lodging ?? "",
    finalPrice: trip.finalPrice?.toString() ?? "",
  });

  async function handleSave() {
    setSaving(true);
    await updateTrip(trip.id, {
      ...form,
      finalPrice: form.finalPrice ? parseFloat(form.finalPrice) : undefined,
    });
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString());
    router.refresh();
  }

  async function handleLock() {
    if (!confirm(trip.isLocked ? "Unlock the trip?" : "Lock the trip? This will email all approved users.")) return;
    setLocking(true);
    if (trip.isLocked) await unlockTrip(trip.id);
    else await lockTrip(trip.id);
    setLocking(false);
    router.refresh();
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div
        className={`rounded-xl px-5 py-4 flex items-center justify-between gap-3 ${
          trip.isLocked ? "bg-emerald-50 border border-emerald-200" : "bg-white border border-stone-200"
        }`}
      >
        <div>
          <p className="font-medium text-stone-900">
            {trip.isLocked ? "Trip is locked" : "Trip is open"}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            {trip.isLocked && trip.lockedAt
              ? `Locked ${new Date(trip.lockedAt).toLocaleString()} · `
              : ""}
            Total expenses: ${trip.totalExpenses.toFixed(2)}
          </p>
        </div>
        <button
          onClick={handleLock}
          disabled={locking}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            trip.isLocked
              ? "border border-amber-400 text-amber-800 hover:bg-amber-50"
              : "bg-stone-900 text-white hover:bg-stone-800"
          } disabled:opacity-50`}
        >
          {locking ? "Working…" : trip.isLocked ? "Unlock trip" : "Lock trip"}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-5">
        <h2 className="font-medium text-stone-900">Trip details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">TRIP NAME</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">DESTINATION</label>
            <input value={form.destination} onChange={(e) => set("destination", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">START DATE</label>
            <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">END DATE</label>
            <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">FINAL PRICE PER PERSON ($)</label>
            <input type="number" value={form.finalPrice} onChange={(e) => set("finalPrice", e.target.value)} className={inputCls} placeholder="e.g. 425.00" />
            <p className="text-xs text-stone-500 mt-1">The $75 refundable security deposit is charged on top automatically.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">DESCRIPTION</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={`${inputCls} resize-none`}
            placeholder="Quick trip overview shown on the dashboard."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">LODGING NOTES</label>
          <textarea
            rows={3}
            value={form.lodging}
            onChange={(e) => set("lodging", e.target.value)}
            className={`${inputCls} resize-none`}
            placeholder="Address, parking, gate codes, the vibe — text only. Use the photo manager below for pictures."
          />
        </div>

        <div className="rounded-lg bg-stone-50 border border-stone-200 px-4 py-3 text-sm text-stone-700">
          <p>
            <strong>Itinerary &amp; meals</strong> live on their own page now —{" "}
            <Link href="/admin/itinerary" className="underline underline-offset-2 hover:text-stone-900">
              edit them per day →
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-stone-900 text-white rounded-lg font-medium text-sm hover:bg-stone-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {savedAt && <span className="text-xs text-stone-500">Saved at {savedAt}</span>}
        </div>
      </div>
    </div>
  );
}
