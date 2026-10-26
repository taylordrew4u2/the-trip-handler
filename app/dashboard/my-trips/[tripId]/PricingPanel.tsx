"use client";

import { useState, useTransition } from "react";
import {
  lockMyTripPrice,
  unlockMyTripPrice,
  unlockMyTrip,
  updateMyTripPrice,
  updateMyTripCostShareDivisor,
  type PriceKind,
} from "@/app/actions/trips";

type Pricing = {
  costShareDivisor: number;
  housingPrice: number | null;
  housingLocked: boolean;
  transportPrice: number | null;
  transportLocked: boolean;
  mealsPrice: number | null;
  mealsLocked: boolean;
  isLocked: boolean;
  finalPrice: number | null;
  depositAmount: number;
  /** False when the owner turned the Meals section off. */
  hasMeals: boolean;
  /** False when the owner turned Transportation off. */
  hasTransport: boolean;
};

const LINES: { kind: PriceKind; label: string }[] = [
  { kind: "housing", label: "Housing" },
  { kind: "transport", label: "Transport" },
  { kind: "meals", label: "Meals" },
];

export function PricingPanel({ tripId, pricing }: { tripId: string; pricing: Pricing }) {
  const [splitDraft, setSplitDraft] = useState(pricing.costShareDivisor.toString());
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<PriceKind, string>>({
    housing: pricing.housingPrice?.toString() ?? "",
    transport: pricing.transportPrice?.toString() ?? "",
    meals: pricing.mealsPrice?.toString() ?? "",
  });

  function run(action: () => Promise<{ error?: string } | void>) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) setError(result.error);
    });
  }

  const amount = (k: PriceKind) =>
    k === "housing" ? pricing.housingPrice : k === "transport" ? pricing.transportPrice : pricing.mealsPrice;
  const isLineLocked = (k: PriceKind) =>
    k === "housing" ? pricing.housingLocked : k === "transport" ? pricing.transportLocked : pricing.mealsLocked;

  const lines = LINES.filter(
    (l) => (l.kind !== "meals" || pricing.hasMeals) && (l.kind !== "transport" || pricing.hasTransport),
  );
  const total =
    (pricing.housingPrice ?? 0) +
    (pricing.hasTransport ? pricing.transportPrice ?? 0 : 0) +
    (pricing.hasMeals ? pricing.mealsPrice ?? 0 : 0);
  const share = total / pricing.costShareDivisor;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6 space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-950">Pricing</h2>
        <p className="text-slate-600 text-sm leading-6 mt-2 max-w-2xl">
          Enter each cost as a total for the trip. It&apos;s split {pricing.costShareDivisor} ways. Lock every
          line to move approved members to payment.
          {(!pricing.hasMeals || !pricing.hasTransport) && " Lines for things this trip doesn't have are hidden."}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updateMyTripCostShareDivisor(tripId, Number(splitDraft)));
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <label className="text-sm text-slate-700">
          Split costs between
          <input
            type="number"
            min="1"
            max="2147483647"
            step="1"
            required
            value={splitDraft}
            onChange={(e) => setSplitDraft(e.target.value)}
            disabled={pricing.isLocked || isPending}
            className="mt-1 block w-32 min-h-[44px] rounded-xl border border-slate-300 px-3 text-slate-900 disabled:bg-slate-100"
          />
        </label>
        <button
          type="submit"
          disabled={pricing.isLocked || isPending || splitDraft === pricing.costShareDivisor.toString()}
          className="min-h-[44px] rounded-xl bg-teal-700 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          Save split
        </button>
        <p className="w-full text-xs text-slate-600">
          Choose the number of shares, independently of the roster. Save before locking prices.
        </p>
      </form>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {pricing.isLocked ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm text-green-800 font-medium">
            Trip locked — base per-person share is ${pricing.finalPrice?.toFixed(2)} (+ ${pricing.depositAmount.toFixed(2)} deposit).
          </p>
          <p className="text-xs text-green-700 mt-1">
            Approved members can now see what they owe on their Payment page.
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => unlockMyTrip(tripId))}
            className="inline-flex items-center justify-center mt-3 px-3 min-h-[44px] rounded-xl border border-slate-300 bg-white transition-colors hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-medium disabled:opacity-50"
          >
            Unlock trip to edit prices
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {lines.map(({ kind, label }) => {
            const locked = isLineLocked(kind);
            return (
              <div key={kind} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 sm:p-4">
                <span className="w-16 sm:w-20 shrink-0 text-sm text-slate-700">{label}</span>
                <div className="flex-1 min-w-0 flex items-center gap-1">
                  <span className="text-slate-600 text-sm">$</span>
                  <input
                    aria-label={`${label} total cost`}
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={locked || isPending}
                    value={drafts[kind]}
                    onChange={(e) => setDrafts((d) => ({ ...d, [kind]: e.target.value }))}
                    onBlur={() => {
                      const raw = drafts[kind].trim();
                      const next = raw === "" ? null : Number(raw);
                      if (next !== amount(kind)) run(() => updateMyTripPrice(tripId, kind, next));
                    }}
                    inputMode="decimal"
                    className="w-full min-w-0 sm:w-32 px-3 min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-600 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 text-sm disabled:bg-slate-100 disabled:text-slate-600"
                    placeholder="0.00"
                  />
                </div>
                <button
                  type="button"
                  disabled={isPending || splitDraft !== pricing.costShareDivisor.toString() || (!locked && amount(kind) == null)}
                  onClick={() =>
                    run(() => (locked ? unlockMyTripPrice(tripId, kind) : lockMyTripPrice(tripId, kind)))
                  }
                  className={`inline-flex items-center justify-center shrink-0 px-3 min-h-[44px] rounded-xl text-xs font-medium disabled:opacity-50 ${
                    locked
                      ? "border border-slate-300 hover:bg-slate-100 text-slate-700"
                      : "bg-teal-700 transition-colors hover:bg-teal-800 text-white"
                  }`}
                >
                  {locked ? "Unlock" : "Lock"}
                </button>
              </div>
            );
          })}

          <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <span className="text-slate-600">Per-person share</span>
            <span className="font-semibold text-slate-950">
              ${share.toFixed(2)}{" "}
              <span className="text-slate-600 font-normal">+ ${pricing.depositAmount.toFixed(2)} deposit</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
