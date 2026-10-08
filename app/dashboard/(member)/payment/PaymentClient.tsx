"use client";

import { useState } from "react";
import { createCheckoutSession } from "@/app/actions/payments";
import { useSearchParams } from "next/navigation";
import { SECURITY_DEPOSIT_USD, COST_SHARE_DIVISOR } from "@/lib/pricing";

interface PaymentClientProps {
  trip: {
    id: string;
    name: string;
    finalPrice: number | null;
    isLocked: boolean;
    housingPrice: number | null;
    housingLocked: boolean;
    transportPrice: number | null;
    transportLocked: boolean;
    mealsPrice: number | null;
    mealsLocked: boolean;
  } | null;
  user: { id: string; name: string; status: string } | null;
  payment: { status: string; amount: number; createdAt: Date } | null;
}

const LINES: { key: "housing" | "transport" | "meals"; label: string }[] = [
  { key: "housing", label: "Housing" },
  { key: "transport", label: "Transport" },
  { key: "meals", label: "Meals" },
];

export function PaymentClient({ trip, user, payment }: PaymentClientProps) {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const cancelled = searchParams.get("cancelled");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isPaid = user?.status === "CONFIRMED_PAID" || payment?.status === "COMPLETED";

  if (success || isPaid) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-300 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 mb-2">Confirmed</p>
        <h2 className="font-serif text-2xl font-medium text-slate-900 mb-2">You&apos;re in.</h2>
        <p className="text-slate-600">Your payment was received. See you on the trip.</p>
      </div>
    );
  }

  if (!trip) {
    return <div className="bg-white rounded-2xl border border-slate-200 p-6 text-slate-600 text-sm">No trip set up yet.</div>;
  }

  const lineRows = LINES.map((l) => {
    if (l.key === "housing") return { ...l, total: trip.housingPrice, locked: trip.housingLocked };
    if (l.key === "transport") return { ...l, total: trip.transportPrice, locked: trip.transportLocked };
    return { ...l, total: trip.mealsPrice, locked: trip.mealsLocked };
  });

  const grandTotal =
    (trip.housingPrice ?? 0) +
    (trip.transportPrice ?? 0) +
    (trip.mealsPrice ?? 0);
  const tripShare = grandTotal / COST_SHARE_DIVISOR;
  const total = tripShare + SECURITY_DEPOSIT_USD;
  const allLocked = trip.housingLocked && trip.transportLocked && trip.mealsLocked;
  const anySet = trip.housingPrice != null || trip.transportPrice != null || trip.mealsPrice != null;

  async function handlePay() {
    if (!trip?.finalPrice) return;
    setLoading(true);
    setError("");
    const result = await createCheckoutSession();
    if (result.url) {
      window.location.href = result.url;
    } else {
      setLoading(false);
      setError(result.error ?? "Payment failed. Please try again.");
    }
  }

  return (
    <div className="min-w-0 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6 md:p-8 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-600 mb-1">
          {trip.isLocked ? "Confirm your spot" : cancelled ? "Try again" : "Cost breakdown"}
        </p>
        <h2 className="font-serif text-2xl font-medium text-slate-900">
          {trip.isLocked
            ? "Trip is locked. Time to pay."
            : anySet
            ? "Estimated trip cost so far"
            : "Trip cost not set yet"}
        </h2>
        <p className="text-xs text-slate-600 mt-1.5">
          Costs are entered as totals for the trip and split {COST_SHARE_DIVISOR} ways.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        {lineRows.map((row, i) => (
          <div
            key={row.key}
            className={`px-4 py-3 ${i < lineRows.length - 1 ? "border-b border-slate-100" : ""}`}
          >
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 break-words">{row.label}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {row.total == null
                    ? "Not set yet"
                    : row.locked
                    ? "Locked in (final)"
                    : "Estimate — not finalized"}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`font-medium tabular-nums ${
                    row.total == null ? "text-slate-600 italic" : "text-slate-900"
                  }`}
                >
                  {row.total == null ? "TBD" : `$${row.total.toFixed(2)}`}
                  {row.total != null && (
                    <span className="text-xs text-slate-600"> total</span>
                  )}
                </p>
                {row.total != null && (
                  <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                    ÷ {COST_SHARE_DIVISOR} = ${(row.total / COST_SHARE_DIVISOR).toFixed(2)} each
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="px-4 py-4 flex flex-wrap justify-between items-start gap-3 bg-indigo-50 border-t border-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-900">Your trip share</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {allLocked
                ? `Final · $${grandTotal.toFixed(2)} ÷ ${COST_SHARE_DIVISOR}`
                : anySet
                ? `Running estimate · $${grandTotal.toFixed(2)} ÷ ${COST_SHARE_DIVISOR}`
                : "Waiting on admin"}
            </p>
          </div>
          <p className="font-semibold text-slate-900 tabular-nums">${tripShare.toFixed(2)}</p>
        </div>
        <div className="px-4 py-4 flex flex-wrap justify-between items-center gap-3 border-t border-slate-100">
          <div>
            <p className="text-sm font-medium text-slate-900">Security deposit</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Refunded after the trip if rules are followed and there&apos;s no damage.
            </p>
          </div>
          <p className="font-medium text-slate-900 tabular-nums">${SECURITY_DEPOSIT_USD.toFixed(2)}</p>
        </div>
        <div className="px-4 py-4 flex flex-wrap justify-between items-center gap-3 bg-indigo-600 text-white">
          <p className="text-sm font-semibold">{trip.isLocked ? "Total today" : "Total when locked"}</p>
          <p className="font-semibold text-2xl tabular-nums">${total.toFixed(2)}</p>
        </div>
      </div>

      {trip.isLocked ? (
        <>
          <div className="text-xs text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-3">
            The <strong>${SECURITY_DEPOSIT_USD} deposit is included</strong> in the total above. It comes back if rules are
            followed and there&apos;s no damage. Break a rule or damage something and the deposit is forfeit (and you
            may owe more on top).
          </div>
          <button
            onClick={handlePay}
            disabled={loading}
            className="min-w-[44px] min-h-[44px] w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Loading checkout…" : `Pay $${total.toFixed(2)}`}
          </button>
          <p className="text-xs text-center text-slate-600">Powered by Stripe · Secure payment</p>
        </>
      ) : (
        <p className="text-xs text-slate-600 leading-relaxed">
          Numbers above are estimates while admin lines up housing, transport, and meals. Once each
          line is locked the total is final and you&apos;ll get an email asking you to pay (your
          1/{COST_SHARE_DIVISOR} share + the refundable ${SECURITY_DEPOSIT_USD} deposit).
        </p>
      )}
    </div>
  );
}
