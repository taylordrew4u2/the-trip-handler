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
    <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-5">
      <div>
        <h2 className="font-serif text-xl font-medium text-stone-900">Pricing</h2>
        <p className="text-stone-500 text-sm mt-1">
          Enter each cost as a total for the trip. It&apos;s split {COST_SHARE_DIVISOR} ways. Lock all
          three lines to move approved members to payment.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {pricing.isLocked ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
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
            className="mt-3 px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-medium disabled:opacity-50"
          >
            Unlock trip to edit prices
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {LINES.map(({ kind, label }) => {
            const locked = isLineLocked(kind);
            return (
              <div key={kind} className="flex items-center gap-3">
                <span className="w-20 text-sm text-stone-700">{label}</span>
                <div className="flex-1 flex items-center gap-1">
                  <span className="text-stone-400 text-sm">$</span>
                  <input
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
                    className="w-32 px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm disabled:bg-stone-100 disabled:text-stone-500"
                    placeholder="0.00"
                  />
                </div>
                <button
                  type="button"
                  disabled={isPending || (!locked && amount(kind) == null)}
                  onClick={() =>
                    run(() => (locked ? unlockMyTripPrice(tripId, kind) : lockMyTripPrice(tripId, kind)))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 ${
                    locked
                      ? "border border-stone-300 hover:bg-stone-100 text-stone-700"
                      : "bg-stone-900 hover:bg-stone-800 text-white"
                  }`}
                >
                  {locked ? "Unlock" : "Lock"}
                </button>
              </div>
            );
          })}

          <div className="border-t border-stone-100 pt-3 flex items-center justify-between text-sm">
            <span className="text-stone-500">Per-person share</span>
            <span className="font-medium text-stone-900">
              ${share.toFixed(2)}{" "}
              <span className="text-stone-400 font-normal">+ ${SECURITY_DEPOSIT_USD} deposit</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
