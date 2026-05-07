"use client";

import { useState } from "react";
import { createCheckoutSession } from "@/app/actions/payments";
import { useSearchParams } from "next/navigation";
import { SECURITY_DEPOSIT_USD } from "@/lib/pricing";

interface PaymentClientProps {
  trip: { id: string; name: string; finalPrice: number | null; isLocked: boolean };
  user: { id: string; name: string; status: string } | null;
  payment: { status: string; amount: number; createdAt: Date } | null;
  userId: string;
}

export function PaymentClient({ trip, user, payment, userId }: PaymentClientProps) {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const cancelled = searchParams.get("cancelled");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isPaid = user?.status === "CONFIRMED_PAID" || payment?.status === "COMPLETED";
  const tripShare = trip.finalPrice ?? 0;
  const total = tripShare + SECURITY_DEPOSIT_USD;

  async function handlePay() {
    if (!trip.finalPrice) return;
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

  if (success || isPaid) {
    return (
      <div className="bg-white rounded-xl border border-emerald-300 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 mb-2">Confirmed</p>
        <h2 className="font-serif text-2xl font-medium text-stone-900 mb-2">You&apos;re in.</h2>
        <p className="text-stone-600">Your payment was received. See you at camp.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 md:p-8">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">
          {cancelled ? "Try again" : "Confirm your spot"}
        </p>
        <h2 className="font-serif text-2xl font-medium text-stone-900">
          {cancelled ? "Payment cancelled — no worries." : "The trip is locked. Time to pay."}
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      )}

      {trip.finalPrice ? (
        <div className="space-y-5">
          <div className="border border-stone-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 flex justify-between items-center border-b border-stone-100">
              <div>
                <p className="text-sm font-medium text-stone-900">Your trip share</p>
                <p className="text-xs text-stone-500">Travel + meals + lodging</p>
              </div>
              <p className="font-medium text-stone-900 tabular-nums">${tripShare.toFixed(2)}</p>
            </div>
            <div className="px-4 py-3 flex justify-between items-center border-b border-stone-100">
              <div>
                <p className="text-sm font-medium text-stone-900">Security deposit</p>
                <p className="text-xs text-stone-500">Refunded after the trip if everyone follows the rules and there&apos;s no damage.</p>
              </div>
              <p className="font-medium text-stone-900 tabular-nums">${SECURITY_DEPOSIT_USD.toFixed(2)}</p>
            </div>
            <div className="px-4 py-3 flex justify-between items-center bg-stone-50">
              <p className="text-sm font-semibold text-stone-900">Total today</p>
              <p className="font-semibold text-lg text-stone-900 tabular-nums">${total.toFixed(2)}</p>
            </div>
          </div>

          <div className="text-xs text-stone-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-3">
            Heads up — the <strong>$75 deposit is included</strong> in the total above. It comes back to you
            after the trip if the rules are followed and there&apos;s no damage. Break a rule or damage
            something and the deposit is forfeit (and you may owe more on top).
          </div>

          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Loading checkout…" : `Pay $${total.toFixed(2)}`}
          </button>
          <p className="text-xs text-center text-stone-500">Powered by Stripe · Secure payment</p>
        </div>
      ) : (
        <p className="text-center text-stone-500 text-sm">Final price not yet set by admin.</p>
      )}
    </div>
  );
}
