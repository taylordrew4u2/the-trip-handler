"use client";

import { ExpenseCard } from "@/components/ExpenseCard";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  notes: string | null;
  approved: boolean;
  receiptUrl: string | null;
  submitter: { name: string } | null;
  createdAt: Date;
}

export function ExpensesClient({ expenses }: { expenses: Expense[] }) {
  const approved = expenses.filter((e) => e.approved);
  const pending = expenses.filter((e) => !e.approved);
  const total = approved.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="text-sm text-slate-600">
          {approved.length} approved · {pending.length} pending
        </div>
        <div className="text-xl font-semibold text-slate-950 tabular-nums">
          Total: ${total.toFixed(2)}
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 sm:py-12">
          <p>No expenses yet.</p>
          <p className="text-sm mt-1">Admin will add shared expenses as they come up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} />
          ))}
        </div>
      )}
    </div>
  );
}
