"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  updateTrip,
  unlockTrip,
  updateTripPriceLine,
  lockTripPriceLine,
  unlockTripPriceLine,
  type PriceKind,
} from "@/app/actions/admin";
import { SECURITY_DEPOSIT_USD, TRIP_CAPACITY, COST_SHARE_DIVISOR } from "@/lib/pricing";

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
  housingPrice: number | null;
  housingLocked: boolean;
  transportPrice: number | null;
  transportLocked: boolean;
  mealsPrice: number | null;
  mealsLocked: boolean;
  totalExpenses: number;
  lockedAt: Date | null;
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900";

const PRICE_LABEL: Record<PriceKind, string> = {
  housing: "Housing",
  transport: "Transport",
  meals: "Meals",
};

export function TripClient({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [lineError, setLineError] = useState("");
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: trip.name,
    destination: trip.destination ?? "",
    startDate: trip.startDate ? new Date(trip.startDate).toISOString().split("T")[0] : "",
    endDate: trip.endDate ? new Date(trip.endDate).toISOString().split("T")[0] : "",
    description: trip.description ?? "",
    lodging: trip.lodging ?? "",
  });

  const [priceDrafts, setPriceDrafts] = useState({
    housing: trip.housingPrice?.toString() ?? "",
    transport: trip.transportPrice?.toString() ?? "",
    meals: trip.mealsPrice?.toString() ?? "",
  });

  async function handleSave() {
    setSaving(true);
    await updateTrip(trip.id, form);
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString());
    router.refresh();
  }

  async function handleUnlockTrip() {
    if (!confirm("Unlock the trip? This re-opens the price lines for editing. Already-paid users stay paid.")) return;
    startTransition(async () => {
      await unlockTrip(trip.id);
      router.refresh();
    });
  }

  async function handleLineSave(kind: PriceKind) {
    setLineError("");
    const raw = priceDrafts[kind].trim();
    const amount = raw === "" ? null : parseFloat(raw);
    if (amount !== null && (Number.isNaN(amount) || amount < 0)) {
      setLineError("Enter a non-negative number.");
      return;
    }
    startTransition(async () => {
      const result = await updateTripPriceLine(trip.id, kind, amount);
      if (result?.error) {
        setLineError(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function handleLineLockToggle(kind: PriceKind, currentlyLocked: boolean) {
    setLineError("");
    const action = currentlyLocked ? unlockTripPriceLine : lockTripPriceLine;
    if (!currentlyLocked) {
      const allOthersLocked =
        (kind === "housing"
          ? trip.transportLocked && trip.mealsLocked
          : kind === "transport"
          ? trip.housingLocked && trip.mealsLocked
          : trip.housingLocked && trip.transportLocked);
      if (allOthersLocked) {
        const total =
          (kind === "housing" ? parseFloat(priceDrafts.housing || "0") : trip.housingPrice ?? 0) +
          (kind === "transport" ? parseFloat(priceDrafts.transport || "0") : trip.transportPrice ?? 0) +
          (kind === "meals" ? parseFloat(priceDrafts.meals || "0") : trip.mealsPrice ?? 0);
        const share = total / COST_SHARE_DIVISOR;
        if (
          !confirm(
            `Locking ${PRICE_LABEL[kind]} will solidify the trip and email all approved users to pay $${share.toFixed(2)} each ($${total.toFixed(2)} ÷ ${COST_SHARE_DIVISOR} + $${SECURITY_DEPOSIT_USD} deposit). Continue?`
          )
        )
          return;
      }
    }
    startTransition(async () => {
      const result = await action(trip.id, kind);
      if (result?.error) setLineError(result.error);
      router.refresh();
    });
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const total =
    (trip.housingPrice ?? 0) + (trip.transportPrice ?? 0) + (trip.mealsPrice ?? 0);
  const allLineEstimates =
    trip.housingPrice != null && trip.transportPrice != null && trip.mealsPrice != null;
  const allLocked = trip.housingLocked && trip.transportLocked && trip.mealsLocked;

  return (
    <div className="space-y-6">
      <div
        className={`rounded-xl px-5 py-4 flex items-center justify-between gap-3 ${
          trip.isLocked ? "bg-emerald-50 border border-emerald-200" : "bg-white border border-stone-200"
        }`}
      >
        <div>
          <p className="font-medium text-stone-900">
            {trip.isLocked ? "Trip is solidified" : "Trip is open"}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            {trip.isLocked && trip.lockedAt
              ? `Solidified ${new Date(trip.lockedAt).toLocaleString()} · `
              : ""}
            Total expenses: ${trip.totalExpenses.toFixed(2)}
          </p>
        </div>
        {trip.isLocked && (
          <button
            onClick={handleUnlockTrip}
            disabled={pending}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-amber-400 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
          >
            {pending ? "Working…" : "Unlock trip"}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <div>
          <h2 className="font-medium text-stone-900">Pricing breakdown</h2>
          <p className="text-stone-500 text-sm mt-0.5">
            Enter the <strong>total</strong> for each line (the whole trip). Each user pays their
            share, divided by {COST_SHARE_DIVISOR} (the roster opens up to {TRIP_CAPACITY} spots,
            but the per-person share stays a {COST_SHARE_DIVISOR}-way split). Lock a line when its
            number is final. When all three are locked, the trip is solidified automatically and
            approved users get payment emails.
          </p>
        </div>

        {lineError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
            {lineError}
          </div>
        )}

        {(["housing", "transport", "meals"] as PriceKind[]).map((kind) => {
          const fields = {
            housing: { amount: trip.housingPrice, locked: trip.housingLocked },
            transport: { amount: trip.transportPrice, locked: trip.transportLocked },
            meals: { amount: trip.mealsPrice, locked: trip.mealsLocked },
          }[kind];
          const draft = priceDrafts[kind];
          const dirty = draft !== (fields.amount?.toString() ?? "");
          return (
            <div key={kind} className="grid grid-cols-12 items-center gap-3 border border-stone-200 rounded-lg px-3 py-3">
              <div className="col-span-3 md:col-span-2">
                <p className="text-sm font-medium text-stone-900">{PRICE_LABEL[kind]}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {fields.locked ? "Locked total" : fields.amount != null ? "Estimate · total" : "Not set"}
                </p>
                {fields.amount != null && (
                  <p className="text-xs text-stone-700 mt-1 tabular-nums">
                    ÷ {COST_SHARE_DIVISOR} = ${(fields.amount / COST_SHARE_DIVISOR).toFixed(2)} each
                  </p>
                )}
              </div>
              <div className="col-span-5 md:col-span-5 flex items-center gap-2">
                <span className="text-stone-500 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={draft}
                  onChange={(e) => setPriceDrafts((p) => ({ ...p, [kind]: e.target.value }))}
                  disabled={fields.locked || trip.isLocked}
                  className={`${inputCls} ${fields.locked ? "bg-stone-100 text-stone-500" : ""}`}
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-4 md:col-span-5 flex items-center gap-2 justify-end flex-wrap">
                {dirty && !fields.locked && !trip.isLocked && (
                  <button
                    onClick={() => handleLineSave(kind)}
                    disabled={pending}
                    className="text-xs px-3 py-1.5 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100 disabled:opacity-50"
                  >
                    Save
                  </button>
                )}
                {!trip.isLocked && (
                  <button
                    onClick={() => handleLineLockToggle(kind, fields.locked)}
                    disabled={pending || (!fields.locked && fields.amount == null && draft.trim() === "")}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium disabled:opacity-50 ${
                      fields.locked
                        ? "border border-amber-400 text-amber-800 hover:bg-amber-50"
                        : "bg-stone-900 text-white hover:bg-stone-800"
                    }`}
                  >
                    {fields.locked ? "Unlock" : "Lock in"}
                  </button>
                )}
                {trip.isLocked && (
                  <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-900 font-medium">
                    Final
                  </span>
                )}
              </div>
            </div>
          );
        })}

        <div className="border-t border-stone-200 pt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="text-stone-700">
              Trip total{" "}
              <span className="text-xs text-stone-500">
                {allLocked
                  ? "(final)"
                  : allLineEstimates
                  ? "(all estimates)"
                  : "(some lines not set)"}
              </span>
            </div>
            <div className="font-semibold text-stone-900 tabular-nums">${total.toFixed(2)}</div>
          </div>
          <div className="flex items-center justify-between text-stone-700">
            <span>÷ {COST_SHARE_DIVISOR} = each user pays</span>
            <span className="font-semibold tabular-nums">${(total / COST_SHARE_DIVISOR).toFixed(2)}</span>
          </div>
        </div>
        <p className="text-xs text-stone-500">
          $75 refundable security deposit is added at checkout automatically (on top of the share above).
        </p>
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
