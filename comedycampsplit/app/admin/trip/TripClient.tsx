"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export function TripClient({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [form, setForm] = useState({
    name: trip.name,
    destination: trip.destination ?? "",
    startDate: trip.startDate ? new Date(trip.startDate).toISOString().split("T")[0] : "",
    endDate: trip.endDate ? new Date(trip.endDate).toISOString().split("T")[0] : "",
    description: trip.description ?? "",
    itinerary: trip.itinerary ?? "",
    lodging: trip.lodging ?? "",
    meals: trip.meals ?? "",
    finalPrice: trip.finalPrice?.toString() ?? "",
  });

  async function handleSave() {
    setSaving(true);
    await updateTrip(trip.id, {
      ...form,
      finalPrice: form.finalPrice ? parseFloat(form.finalPrice) : undefined,
    });
    setSaving(false);
  }

  async function handleLock() {
    if (!confirm(trip.isLocked ? "Unlock the trip?" : "Lock the trip? This will email all approved users.")) return;
    setLocking(true);
    if (trip.isLocked) {
      await unlockTrip(trip.id);
    } else {
      await lockTrip(trip.id);
    }
    setLocking(false);
    router.refresh();
  }

  function field(label: string, key: keyof typeof form, type: string = "text", rows?: number) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {rows ? (
          <textarea
            rows={rows}
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm resize-none"
          />
        ) : (
          <input
            type={type}
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl p-4 flex items-center justify-between ${trip.isLocked ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
        <div>
          <p className="font-medium text-gray-900">{trip.isLocked ? "🔒 Trip is Locked" : "🔓 Trip is Open"}</p>
          {trip.isLocked && trip.lockedAt && (
            <p className="text-sm text-gray-500">Locked {new Date(trip.lockedAt).toLocaleString()}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">Total Expenses: ${trip.totalExpenses.toFixed(2)}</p>
        </div>
        <button
          onClick={handleLock}
          disabled={locking}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${trip.isLocked ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-green-100 text-green-700 hover:bg-green-200"} disabled:opacity-50`}
        >
          {locking ? "..." : trip.isLocked ? "Unlock Trip" : "🔒 Lock Trip"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Trip Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("Trip Name", "name")}
          {field("Destination", "destination")}
          {field("Start Date", "startDate", "date")}
          {field("End Date", "endDate", "date")}
          {field("Final Price Per Person ($)", "finalPrice", "number")}
        </div>
        {field("Description", "description", "text", 3)}
        {field("Itinerary / Schedule", "itinerary", "text", 6)}
        {field("Lodging Info", "lodging", "text", 4)}
        {field("Meals Info", "meals", "text", 4)}

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
