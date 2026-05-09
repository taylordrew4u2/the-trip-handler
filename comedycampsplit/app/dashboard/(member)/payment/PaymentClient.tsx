"use client";

import { useState } from "react";
import { createCheckoutSession } from "@/app/actions/payments";
import { useSearchParams } from "next/navigation";
import { SECURITY_DEPOSIT_USD } from "@/lib/pricing";

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
  userId: string;
}

const LINES: { key: "housing" | "transport" | "meals"; label: string }[] = [
  { key: "housing", label: "Housing" },
  { key: "transport", label: "Transport" },
  { key: "meals", label: "Meals" },
];

export function PaymentClient({ trip, user, payment, userId }: PaymentClientProps) {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const cancelled = searchParams.get("cancelled");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isPaid = user?.status === "CONFIRMED_PAID" || payment?.status === "COMPLETED";

  if (success || isPaid) {
    return (
      <div className="bg-white rounded-xl border border-emerald-300 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 mb-2">Confirmed</p>
        <h2 className="font-serif text-2xl font-medium text-stone-900 mb-2">You&apos;re in.</h2>
        <p className="text-stone-600">Your payment was received. See you at camp.</p>
      </div>
    );
  }

  if (!trip) {
    return <div className="bg-white rounded-xl border border-stone-200 p-6 text-stone-500 text-sm">No trip set up yet.</div>;
  }

  const lineRows = LINES.map((l) => {
    if (l.key === "housing") return { ...l, amount: trip.housingPrice, locked: trip.housingLocked };
    if (l.key === "transport") return { ...l, amount: trip.transportPrice, locked: trip.transportLocked };
    return { ...l, amount: trip.mealsPrice, locked: trip.mealsLocked };
  });

  const tripShare =
    (trip.housingPrice ?? 0) +
    (trip.transportPrice ?? 0) +
    (trip.mealsPrice ?? 0);
  const total = tripShare + SECURITY_DEPOSIT_USD;
  const allLocked = trip.housingLocked && trip.transportLocked && trip.mealsLocked;
  const anySet = trip.housingPrice != null || trip.transportPrice != null || trip.mealsPrice != null;

  async function handlePay() {
    if (!trip?.finalPrice) return;
    setLoading(true);
    setError("");
    const result = await createCheckoutSession(userId, trip.finalPrice);
    if (result.url) {
      window.location.href = result.url;
    } else {
      setLoading(false);
      setError(result.error ?? "Payment failed. Please try again.");
    }
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 md:p-8 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-1">
          {trip.isLocked ? "Confirm your spot" : cancelled ? "Try again" : "Cost breakdown"}
        </p>
        <h2 className="font-serif text-2xl font-medium text-stone-900">
          {trip.isLocked
            ? "Trip is locked. Time to pay."
            : anySet
            ? "Estimated trip cost so far"
            : "Trip cost not set yet"}
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="border border-stone-200 rounded-lg overflow-hidden">
        {lineRows.map((row, i) => (
          <div
            key={row.key}
            className={`px-4 py-3 flex justify-between items-center ${
              i < lineRows.length - 1 ? "border-b border-stone-100" : ""
            }`}
          >
            <div>
              <p className="text-sm font-medium text-stone-900">{row.label}</p>
              <p className="text-xs text-stone-500 mt-0.5">
                {row.amount == null
                  ? "Not set yet"
                  : row.locked
                  ? "Locked in (final)"
                  : "Estimate — not finalized"}
              </p>
            </div>
            <p
              className={`font-medium tabular-nums ${
                row.amount == null ? "text-stone-400 italic" : "text-stone-900"
              }`}
            >
              {row.amount == null ? "TBD" : `$${row.amount.toFixed(2)}`}
            </p>
          </div>
        ))}
        <div className="px-4 py-3 flex justify-between items-center bg-stone-50 border-t border-stone-200">
          <div>
            <p className="text-sm font-medium text-stone-900">Trip share</p>
            <p className="text-xs text-stone-500 mt-0.5">
              {allLocked
                ? "Final"
                : anySet
                ? "Running estimate · not final until all three lines lock"
                : "Waiting on admin"}
            </p>
          </div>
          <p className="font-semibold text-stone-900 tabular-nums">${tripShare.toFixed(2)}</p>
        </div>
        <div className="px-4 py-3 flex justify-between items-center border-t border-stone-100">
          <div>
            <p className="text-sm font-medium text-stone-900">Security deposit</p>
            <p className="text-xs text-stone-500 mt-0.5">
              Refunded after the trip if rules are followed and there&apos;s no damage.
            </p>
          </div>
          <p className="font-medium text-stone-900 tabular-nums">${SECURITY_DEPOSIT_USD.toFixed(2)}</p>
        </div>
        <div className="px-4 py-3 flex justify-between items-center bg-stone-900 text-stone-100">
          <p className="text-sm font-semibold">{trip.isLocked ? "Total today" : "Total when locked"}</p>
          <p className="font-semibold text-lg tabular-nums">${total.toFixed(2)}</p>
        </div>
      </div>

      {trip.isLocked ? (
        <>
          <div className="text-xs text-stone-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-3">
            The <strong>${SECURITY_DEPOSIT_USD} deposit is included</strong> in the total above. It comes back if rules are
            followed and there&apos;s no damage. Break a rule or damage something and the deposit is forfeit (and you
            may owe more on top).
          </div>
          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Loading checkout…" : `Pay $${total.toFixed(2)}`}
          </button>
          <p className="text-xs text-center text-stone-500">Powered by Stripe · Secure payment</p>
        </>
      ) : (
        <p className="text-xs text-stone-500 leading-relaxed">
          Numbers above are estimates while admin lines up housing, transport, and meals. Once each
          line is locked the total is final and you&apos;ll get an email asking you to pay (trip
          share + the refundable ${SECURITY_DEPOSIT_USD} deposit).
        </p>
      )}
    </div>
  );
}
