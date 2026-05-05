"use client";

import { approveExpense, deleteExpense } from "@/app/actions/expenses";
import { ExpenseCard } from "@/components/ExpenseCard";
import { useState } from "react";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  notes: string | null;
  approved: boolean;
  receiptUrl: string | null;
  submitter: { name: string };
  createdAt: Date;
}

export function AdminExpensesClient({ expenses }: { expenses: Expense[] }) {
  const [items, setItems] = useState(expenses);

  async function handleApprove(id: string) {
    await approveExpense(id);
    setItems((prev) => prev.map((e) => e.id === id ? { ...e, approved: true } : e));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    await deleteExpense(id);
    setItems((prev) => prev.filter((e) => e.id !== id));
  }

  const total = items.filter((e) => e.approved).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
        <span className="text-sm text-gray-600">
          {items.filter((e) => e.approved).length} approved • {items.filter((e) => !e.approved).length} pending
        </span>
        <span className="font-bold text-gray-900">Total Approved: ${total.toFixed(2)}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No expenses submitted yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((exp) => (
            <ExpenseCard
              key={exp.id}
              expense={exp}
              isAdmin
              onApprove={handleApprove}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
