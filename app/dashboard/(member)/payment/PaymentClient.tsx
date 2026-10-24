"use client";

import { useState } from "react";
import { createCheckoutSession, submitManualPayment } from "@/app/actions/payments";
import { useRouter, useSearchParams } from "next/navigation";
import { formatAdjustment } from "@/lib/pricing";
import { compressImage } from "@/components/compressImage";
import { PaymentMethodsSummary } from "@/components/PaymentMethodsSummary";

export type PaymentView = {
  tripName: string;
  costShareDivisor: number;
  isLocked: boolean;
  isPaid: boolean;
  /** Null when the owner hides the housing/transport/meals totals. */
  lineItems: { key: string; label: string; total: number | null; locked: boolean }[] | null;
  share: number;
  bed: { label: string; adjustment: number } | null;
  personalAdjustment: number | null;
  deposit: number;
  total: number;
  paid: number;
  remaining: number;
  venmoHandle: string | null;
  cashAppHandle: string | null;
  /** Card checkout is only offered when Stripe is set up. */
  cardEnabled: boolean;
  payments: {
    id: string;
    amount: number;
    method: "STRIPE" | "VENMO" | "CASH_APP" | "CASH" | "OTHER";
    status: "PENDING" | "COMPLETED" | "REFUNDED" | "FAILED";
    receiptUrl: string | null;
    createdAt: string;
  }[];
};

const METHOD_LABEL = { STRIPE: "Card", VENMO: "Venmo", CASH_APP: "Cash App", CASH: "Cash", OTHER: "Other" } as const;
const STATUS_LABEL = {
  PENDING: "Waiting on review",
  COMPLETED: "Confirmed",
  REFUNDED: "Refunded",
  FAILED: "Not counted",
} as const;

const money = (n: number) => `$${n.toFixed(2)}`;

export function PaymentClient({ view }: { view: PaymentView }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const cancelled = searchParams.get("cancelled");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<"VENMO" | "CASH_APP" | "OTHER" | null>(null);
  const [sent, setSent] = useState(false);

  // Only card checkouts and owner-reviewed transfers show here; abandoned
  // Stripe sessions stay PENDING forever, so hide them.
  const history = view.payments.filter((p) => !(p.method === "STRIPE" && p.status === "PENDING"));
  const awaitingReview = history.some((p) => p.method !== "STRIPE" && p.status === "PENDING");

  if (view.isPaid) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-emerald-300 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-700 mb-2">Confirmed</p>
          <h2 className="font-serif text-2xl font-medium text-slate-900 mb-2">You&apos;re in.</h2>
          <p className="text-slate-600">Your payment was received. See you on the trip.</p>
        </div>
        <History payments={history} />
      </div>
    );
  }

  // Back from Stripe but not marked paid yet (e.g. the webhook is still on
  // its way, or it was a partial balance): say so instead of "You're in".
  const justPaid = Boolean(success);

  const lines = view.lineItems;
  const anySet = lines ? lines.some((l) => l.total != null) : view.share > 0;
  const allLocked = view.isLocked;
  const offersManual = Boolean(view.venmoHandle || view.cashAppHandle);

  async function handlePay() {
    setLoading(true);
    setError("");
    try {
      const result = await createCheckoutSession();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError(result.error ?? "Payment failed. Please try again.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setLoading(false);
  }

  async function handleManual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!method) return;
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    form.set("method", method);
    try {
      // Keep image preparation inside the same error boundary as the upload.
      // Otherwise a failed conversion leaves the form stuck on “Sending…”.
      const receipt = form.get("receipt");
      if (receipt instanceof File && receipt.size > 0) form.set("receipt", await compressImage(receipt));
      const result = await submitManualPayment(form);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setSent(true);
      setMethod(null);
      router.refresh();
    } catch {
      setError("Couldn't send it — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PaymentMethodsSummary
        isLocked={view.isLocked}
        cardEnabled={view.cardEnabled}
        venmoHandle={view.venmoHandle}
        cashAppHandle={view.cashAppHandle}
      />
      <div className="min-w-0 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6 md:p-8 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-600 mb-1">
            {view.isLocked ? "Confirm your spot" : cancelled ? "Try again" : "Cost breakdown"}
          </p>
          <h2 className="font-serif text-2xl font-medium text-slate-900">
            {view.isLocked
              ? "Trip is locked. Time to pay."
              : anySet
              ? "Estimated trip cost so far"
              : "Trip cost not set yet"}
          </h2>
          {lines && (
            <p className="text-xs text-slate-600 mt-1.5">
              Costs are entered as totals for the trip and split {view.costShareDivisor} ways.
            </p>
          )}
        </div>

        {justPaid && !error && (
          <div role="status" className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-sm">
            Thanks — your card payment is being recorded. If the balance below hasn&apos;t updated, refresh in a minute.
          </div>
        )}
        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {lines?.map((row, i) => (
            <div
              key={row.key}
              className={`px-4 py-3 ${i < lines.length - 1 ? "border-b border-slate-100" : ""}`}
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
                    {row.total == null ? "TBD" : money(row.total)}
                    {row.total != null && <span className="text-xs text-slate-600"> total</span>}
                  </p>
                  {row.total != null && (
                    <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                      ÷ {view.costShareDivisor} = {money(row.total / view.costShareDivisor)} each
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <Row
            highlight
            label="Your trip share"
            sub={allLocked ? "Final" : anySet ? "Running estimate" : "Waiting on admin"}
            value={money(view.share)}
          />
          {view.bed && (
            <Row
              label={`Bed: ${view.bed.label}`}
              sub="This bed is priced differently"
              value={formatAdjustment(view.bed.adjustment)}
            />
          )}
          {view.personalAdjustment != null && (
            <Row label="Adjustment" sub="Set by admin" value={formatAdjustment(view.personalAdjustment)} />
          )}
          <Row
            label="Security deposit"
            sub="Refunded after the trip if rules are followed and there's no damage."
            value={money(view.deposit)}
          />
          {view.paid > 0 && <Row label="Already paid" sub="Confirmed payments" value={`−${money(view.paid)}`} />}
          <div className="px-4 py-4 flex flex-wrap justify-between items-center gap-3 bg-indigo-600 text-white">
            <p className="text-sm font-semibold">
              {view.isLocked ? (view.paid > 0 ? "Balance due" : "Total today") : "Total when locked"}
            </p>
            <p className="font-semibold text-2xl tabular-nums">{money(view.isLocked ? view.remaining : view.total)}</p>
          </div>
        </div>

        {view.isLocked ? (
          <>
            <div className="text-xs text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-3">
              The <strong>{money(view.deposit)} deposit is included</strong> in the total above. It comes back if rules
              are followed and there&apos;s no damage. Break a rule or damage something and the deposit is forfeit (and
              you may owe more on top).
            </div>
            {sent && (
              <div role="status" className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2">
                Sent. The organizer will check it off once they see the money.
              </div>
            )}
            {awaitingReview && !sent && (
              <div className="text-sm bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2">
                You have a payment waiting for the organizer to check off.
              </div>
            )}
            {view.cardEnabled && (
              <>
                <button
                  onClick={handlePay}
                  disabled={loading || view.remaining <= 0}
                  className="min-w-[44px] min-h-[44px] w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {loading && !method ? "Loading checkout…" : `Pay ${money(view.remaining)} by card`}
                </button>
                <p className="text-xs text-center text-slate-600">Powered by Stripe · Secure payment</p>
              </>
            )}

            {view.remaining > 0 && (
              <div className={`space-y-3 ${view.cardEnabled ? "border-t border-slate-200 pt-5" : ""}`}>
                <p className="text-sm font-medium text-slate-900">
                  {view.cardEnabled ? "Or pay with" : `Pay ${money(view.remaining)} with`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {view.venmoHandle && (
                    <MethodButton active={method === "VENMO"} onClick={() => setMethod("VENMO")}>
                      Venmo
                    </MethodButton>
                  )}
                  {view.cashAppHandle && (
                    <MethodButton active={method === "CASH_APP"} onClick={() => setMethod("CASH_APP")}>
                      Cash App
                    </MethodButton>
                  )}
                  <MethodButton active={method === "OTHER"} onClick={() => setMethod("OTHER")}>
                    {offersManual ? "Other (cash, Zelle…)" : "I paid the organizer"}
                  </MethodButton>
                </div>

                {method && (
                  <form onSubmit={handleManual} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    {method === "OTHER" ? (
                      <p className="text-sm text-slate-700">
                        Pay the organizer <strong>{money(view.remaining)}</strong> however you agreed, then tell them
                        here. Add a screenshot if you have one. They&apos;ll check it off.
                      </p>
                    ) : (
                      <p className="text-sm text-slate-700">
                        1. Send <strong>{money(view.remaining)}</strong> to{" "}
                        {method === "VENMO" ? (
                          <a
                            href={`https://venmo.com/u/${encodeURIComponent(view.venmoHandle ?? "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-indigo-700 underline underline-offset-2"
                          >
                            @{view.venmoHandle}
                          </a>
                        ) : (
                          <a
                            href={`https://cash.app/$${encodeURIComponent(view.cashAppHandle ?? "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-indigo-700 underline underline-offset-2"
                          >
                            ${view.cashAppHandle}
                          </a>
                        )}
                        .
                        <br />
                        2. Upload a screenshot of the payment below. The organizer checks it off.
                      </p>
                    )}
                    <label className="block text-xs font-medium text-slate-700">
                      Amount sent
                      <input
                        name="amount"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0.01"
                        required
                        defaultValue={view.remaining.toFixed(2)}
                        className="mt-1 block w-full px-3 min-h-[44px] rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-indigo-600"
                      />
                    </label>
                    <label className="block text-xs font-medium text-slate-700">
                      {method === "OTHER" ? "Receipt or screenshot (optional)" : "Receipt screenshot"}
                      <input
                        name="receipt"
                        type="file"
                        required={method !== "OTHER"}
                        accept="image/*,application/pdf"
                        className="mt-1 block w-full text-sm text-slate-700"
                      />
                    </label>
                    <label className="block text-xs font-medium text-slate-700">
                      {method === "OTHER" ? "How did you pay?" : "Note (optional)"}
                      <input
                        name="note"
                        maxLength={500}
                        required={method === "OTHER"}
                        placeholder={method === "OTHER" ? "e.g. cash in person, Zelle" : undefined}
                        className="mt-1 block w-full px-3 min-h-[44px] rounded-xl border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-indigo-600"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full min-h-[44px] rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                    >
                      {loading ? "Sending…" : "I paid — tell the organizer"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-600 leading-relaxed">
            Numbers above are estimates while the organizer lines up the costs. Once prices are locked the
            total is final and the payment controls will unlock (your share + the refundable{" "}
            {money(view.deposit)} deposit).
          </p>
        )}
      </div>
      <History payments={history} />
    </div>
  );
}

function Row({ label, sub, value, highlight }: { label: string; sub: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`px-4 py-4 flex flex-wrap justify-between items-start gap-3 border-t border-slate-100 first:border-t-0 ${
        highlight ? "bg-indigo-50" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 break-words">{label}</p>
        <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
      </div>
      <p className="font-medium text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

function MethodButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[44px] px-4 rounded-xl border text-sm font-medium transition-colors ${
        active ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function History({ payments }: { payments: PaymentView["payments"] }) {
  if (payments.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Your payments</h3>
      <ul className="divide-y divide-slate-100">
        {payments.map((p) => (
          <li key={p.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-slate-700">
              {METHOD_LABEL[p.method]} · {new Date(p.createdAt).toLocaleDateString()}
              {p.receiptUrl && (
                <>
                  {" · "}
                  <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                    receipt
                  </a>
                </>
              )}
            </span>
            <span className="tabular-nums text-slate-900">
              {money(p.amount)} <span className="text-xs text-slate-600">· {STATUS_LABEL[p.status]}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
