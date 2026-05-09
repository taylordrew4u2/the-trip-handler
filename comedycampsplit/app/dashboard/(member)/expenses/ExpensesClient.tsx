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
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white rounded-xl border border-stone-200 p-4">
        <div className="text-sm text-stone-600">
          {approved.length} approved · {pending.length} pending
        </div>
        <div className="font-medium text-stone-900 tabular-nums">
          Total: ${total.toFixed(2)}
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
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
