"use client";

import { useState, useTransition } from "react";
import {
  lockMyTripPrice,
  unlockMyTripPrice,
  unlockMyTrip,
  updateMyTripPrice,
  type PriceKind,
} from "@/app/actions/trips";
import { COST_SHARE_DIVISOR, SECURITY_DEPOSIT_USD } from "@/lib/pricing";

type Pricing = {
  housingPrice: number | null;
  housingLocked: boolean;
  transportPrice: number | null;
  transportLocked: boolean;
  mealsPrice: number | null;
  mealsLocked: boolean;
  isLocked: boolean;
  finalPrice: number | null;
};

const LINES: { kind: PriceKind; label: string }[] = [
  { kind: "housing", label: "Housing" },
  { kind: "transport", label: "Transport" },
  { kind: "meals", label: "Meals" },
];

export function PricingPanel({ tripId, pricing }: { tripId: string; pricing: Pricing }) {
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

  const total = (pricing.housingPrice ?? 0) + (pricing.transportPrice ?? 0) + (pricing.mealsPrice ?? 0);
  const share = total / COST_SHARE_DIVISOR;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6 space-y-5">
      <div>
        <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-950">Pricing</h2>
        <p className="text-slate-600 text-sm leading-6 mt-2 max-w-2xl">
          Enter each cost as a total for the trip. It&apos;s split {COST_SHARE_DIVISOR} ways. Lock all
          three lines to move approved members to payment.
        </p>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {pricing.isLocked ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm text-green-800 font-medium">
            Trip locked — per-person share is ${pricing.finalPrice?.toFixed(2)} (+ ${SECURITY_DEPOSIT_USD} deposit).
          </p>
          <p className="text-xs text-green-700 mt-1">
            Approved members have been moved to payment and emailed a checkout link.
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
          {LINES.map(({ kind, label }) => {
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
                    className="w-full min-w-0 sm:w-32 px-3 min-h-[44px] rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-600 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-sm disabled:bg-slate-100 disabled:text-slate-600"
                    placeholder="0.00"
                  />
                </div>
                <button
                  type="button"
                  disabled={isPending || (!locked && amount(kind) == null)}
                  onClick={() =>
                    run(() => (locked ? unlockMyTripPrice(tripId, kind) : lockMyTripPrice(tripId, kind)))
                  }
                  className={`inline-flex items-center justify-center shrink-0 px-3 min-h-[44px] rounded-xl text-xs font-medium disabled:opacity-50 ${
                    locked
                      ? "border border-slate-300 hover:bg-slate-100 text-slate-700"
                      : "bg-indigo-600 transition-colors hover:bg-indigo-700 text-white"
                  }`}
                >
                  {locked ? "Unlock" : "Lock"}
                </button>
              </div>
            );
          })}

          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <span className="text-slate-600">Per-person share</span>
            <span className="font-semibold text-slate-950">
              ${share.toFixed(2)}{" "}
              <span className="text-slate-600 font-normal">+ ${SECURITY_DEPOSIT_USD} deposit</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
