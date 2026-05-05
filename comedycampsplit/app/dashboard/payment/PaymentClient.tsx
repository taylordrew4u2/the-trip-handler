"use client";

import { useState } from "react";
import { createCheckoutSession } from "@/app/actions/payments";
import { useSearchParams } from "next/navigation";

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
      <div className="bg-white rounded-2xl border border-green-200 p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-green-700 mb-2">You're Confirmed!</h2>
        <p className="text-gray-500">Your payment has been received. See you at camp! 🎪</p>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="bg-white rounded-2xl border border-yellow-200 p-8 text-center">
        <div className="text-5xl mb-4">😅</div>
        <h2 className="text-xl font-bold text-yellow-700 mb-2">Payment Cancelled</h2>
        <p className="text-gray-500 mb-4">No worries! You can try again below.</p>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        {trip.finalPrice && (
          <button
            onClick={handlePay}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : `Pay $${trip.finalPrice.toFixed(2)}`}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-purple-100 p-8">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">💰</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Confirm Your Spot</h2>
        <p className="text-gray-500">The trip is locked and ready! Pay to confirm your place.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {trip.finalPrice ? (
        <div className="space-y-4">
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <p className="text-sm text-purple-600 mb-1">Your Share</p>
            <p className="text-4xl font-bold text-purple-700">${trip.finalPrice.toFixed(2)}</p>
          </div>
          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full py-4 bg-purple-600 text-white rounded-xl font-semibold text-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading Checkout..." : `🎟️ Pay $${trip.finalPrice.toFixed(2)}`}
          </button>
          <p className="text-xs text-center text-gray-400">Powered by Stripe • Secure payment</p>
        </div>
      ) : (
        <p className="text-center text-gray-500">Final price not yet set by admin.</p>
      )}
    </div>
  );
}
