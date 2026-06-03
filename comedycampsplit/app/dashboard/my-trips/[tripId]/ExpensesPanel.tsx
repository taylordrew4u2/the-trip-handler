"use client";

import { useState, useTransition } from "react";
import { approveTripExpense, deleteTripExpense } from "@/app/actions/trips";

type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  approved: boolean;
  submitter: string | null;
  receiptUrl: string | null;
};

export function ExpensesPanel({
  expenses,
  totalExpenses,
}: {
  expenses: Expense[];
  totalExpenses: number;
}) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string } | void>) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) setError(result.error);
    });
  }

  const pending = expenses.filter((e) => !e.approved).length;

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-serif text-xl font-medium text-stone-900">Expenses</h2>
          <p className="text-stone-500 text-sm mt-1">
            Approve what participants submit. {pending > 0 && `${pending} awaiting review.`}
          </p>
        </div>
        <p className="text-sm text-stone-700 whitespace-nowrap">
          Approved total <span className="font-medium">${totalExpenses.toFixed(2)}</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
      )}

      {expenses.length === 0 ? (
        <p className="text-stone-400 text-sm">No expenses submitted yet.</p>
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 border border-stone-100 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {e.title} <span className="text-stone-500">${e.amount.toFixed(2)}</span>
                </p>
                <p className="text-xs text-stone-500 truncate">
                  {[e.category, e.submitter ? `by ${e.submitter}` : null].filter(Boolean).join(" · ")}
                  {e.receiptUrl && (
                    <>
                      {" · "}
                      <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        receipt
                      </a>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    e.approved ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {e.approved ? "approved" : "pending"}
                </span>
                {!e.approved && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => run(() => approveTripExpense(e.id))}
                    className="px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium disabled:opacity-50"
                  >
                    Approve
                  </button>
                )}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (confirm(`Delete "${e.title}"?`)) run(() => deleteTripExpense(e.id));
                  }}
                  className="px-2.5 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
