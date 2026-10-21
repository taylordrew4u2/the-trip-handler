"use client";

import { useState, useTransition } from "react";
import { updateMemberPriceAdjustment } from "@/app/actions/trips";
import { reviewManualPayment } from "@/app/actions/payments";
import { formatAdjustment } from "@/lib/pricing";

export type MemberPaymentRow = {
  id: string;
  name: string;
  status: string;
  bedLabel: string | null;
  bedAdjustment: number;
  priceAdjustment: number;
  priceAdjustmentNote: string | null;
  share: number;
  total: number;
  paid: number;
  remaining: number;
  payments: {
    id: string;
    amount: number;
    method: "STRIPE" | "VENMO" | "CASH_APP";
    status: "PENDING" | "COMPLETED" | "REFUNDED" | "FAILED";
    receiptUrl: string | null;
    note: string | null;
    createdAt: string;
  }[];
};

const METHOD_LABEL = { STRIPE: "Card", VENMO: "Venmo", CASH_APP: "Cash App" } as const;
const STATUS_STYLE = {
  PENDING: "bg-amber-100 text-amber-900",
  COMPLETED: "bg-green-100 text-green-800",
  REFUNDED: "bg-slate-100 text-slate-700",
  FAILED: "bg-red-100 text-red-800",
} as const;
const STATUS_LABEL = { PENDING: "Needs review", COMPLETED: "Confirmed", REFUNDED: "Refunded", FAILED: "Rejected" } as const;

const money = (n: number) => `$${n.toFixed(2)}`;

export function MemberPaymentsPanel({ members }: { members: MemberPaymentRow[] }) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string } | { success: boolean }>) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if ("error" in result && result.error) setError(result.error);
    });
  }

  const collected = members.reduce((s, m) => s + m.paid, 0);
  const expected = members.reduce((s, m) => s + m.total, 0);
  const toReview = members.reduce(
    (n, m) => n + m.payments.filter((p) => p.method !== "STRIPE" && p.status === "PENDING").length,
    0,
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6 space-y-4">
      <div>
        <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-950">Who pays what</h2>
        <p className="text-slate-600 text-sm leading-6 mt-2 max-w-2xl">
          Only you see this. Give anyone a private discount (negative) or surcharge — they just see their own total.
          Confirm Venmo and Cash App payments against the receipt they uploaded.
        </p>
        <p className="text-sm text-slate-900 mt-2 tabular-nums">
          {money(collected)} collected of {money(expected)}
          {toReview > 0 && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-medium">
              {toReview} to review
            </span>
          )}
        </p>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-sm text-slate-600">No approved members yet.</p>
      ) : (
        <ul className="space-y-3">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} disabled={isPending} run={run} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MemberRow({
  member: m,
  disabled,
  run,
}: {
  member: MemberPaymentRow;
  disabled: boolean;
  run: (action: () => Promise<{ error?: string } | { success: boolean }>) => void;
}) {
  const [adj, setAdj] = useState(m.priceAdjustment ? m.priceAdjustment.toString() : "");
  const [note, setNote] = useState(m.priceAdjustmentNote ?? "");
  const isPaid = m.status === "CONFIRMED_PAID";
  const dirty =
    (adj === "" ? 0 : parseFloat(adj)) !== m.priceAdjustment || (note.trim() || null) !== m.priceAdjustmentNote;
  // Abandoned card checkouts stay PENDING forever; only show settled card rows.
  const payments = m.payments.filter((p) => !(p.method === "STRIPE" && p.status === "PENDING"));

  return (
    <li className="border border-slate-200/80 bg-slate-50/60 rounded-xl px-4 py-3 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 break-words">{m.name}</p>
          <p className="text-xs text-slate-600">
            {m.bedLabel ? (
              <>
                {m.bedLabel}
                {m.bedAdjustment ? ` (${formatAdjustment(m.bedAdjustment)})` : ""}
              </>
            ) : (
              "No bed yet"
            )}
            {m.priceAdjustment ? ` · private ${formatAdjustment(m.priceAdjustment)}` : ""}
          </p>
        </div>
        <div className="text-right text-sm tabular-nums">
          <p className="font-semibold text-slate-900">{money(m.total)}</p>
          <p className="text-xs text-slate-600">
            {isPaid ? "Paid in full" : m.paid > 0 ? `${money(m.paid)} paid · ${money(m.remaining)} left` : "Unpaid"}
          </p>
        </div>
      </div>

      <form
        className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          const amount = adj === "" ? 0 : parseFloat(adj);
          run(() => updateMemberPriceAdjustment(m.id, amount, note));
        }}
      >
        <input
          aria-label={`Private price change for ${m.name}`}
          type="number"
          inputMode="decimal"
          step="0.01"
          value={adj}
          onChange={(e) => setAdj(e.target.value)}
          placeholder="± $"
          disabled={disabled || isPaid}
          className="min-w-0 px-3 min-h-[44px] rounded-xl border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
        />
        <input
          aria-label={`Reason (only you see this) for ${m.name}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason — only you see this"
          maxLength={200}
          disabled={disabled || isPaid}
          className="min-w-0 px-3 min-h-[44px] rounded-xl border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-600 disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={disabled || isPaid || !dirty}
          className="inline-flex items-center justify-center px-4 min-h-[44px] rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50"
        >
          Save
        </button>
      </form>

      {payments.length > 0 && (
        <ul className="divide-y divide-slate-200 border-t border-slate-200 pt-1">
          {payments.map((p) => (
            <li key={p.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <span className="text-slate-900">
                  {METHOD_LABEL[p.method]} · <span className="tabular-nums">{money(p.amount)}</span>
                </span>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded ${STATUS_STYLE[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
                <span className="ml-2 text-xs text-slate-600">{new Date(p.createdAt).toLocaleDateString()}</span>
                {p.receiptUrl && (
                  <a
                    href={p.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs font-medium text-indigo-700 underline underline-offset-2"
                  >
                    View receipt
                  </a>
                )}
                {p.note && <p className="text-xs text-slate-600 mt-0.5 break-words">“{p.note}”</p>}
              </div>
              {p.method !== "STRIPE" && p.status === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => run(() => reviewManualPayment(p.id, true))}
                    className="min-h-[44px] px-3 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (confirm(`Reject this ${METHOD_LABEL[p.method]} payment from ${m.name}?`)) {
                        run(() => reviewManualPayment(p.id, false));
                      }
                    }}
                    className="min-h-[44px] px-3 rounded-xl border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
