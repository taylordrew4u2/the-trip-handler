"use client";

import { addExpense, approveExpense, deleteExpense } from "@/app/actions/expenses";
import { ExpenseCard } from "@/components/ExpenseCard";
import { useState } from "react";
import { useRouter } from "next/navigation";

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

const CATEGORIES = ["Food", "Transport", "Lodging", "Activities", "Equipment", "Other"];

export function AdminExpensesClient({ expenses, tripId }: { expenses: Expense[]; tripId: string }) {
  const router = useRouter();
  const [items, setItems] = useState(expenses);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.append("tripId", tripId);
    const result = await addExpense(formData);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setShowForm(false);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function handleApprove(id: string) {
    await approveExpense(id);
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, approved: true } : e)));
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
          {items.filter((e) => e.approved).length} approved · {items.filter((e) => !e.approved).length} pending
        </span>
        <span className="font-bold text-gray-900 tabular-nums">Total approved: ${total.toFixed(2)}</span>
      </div>

      <button
        onClick={() => setShowForm(!showForm)}
        className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800"
      >
        {showForm ? "Cancel" : "+ Add expense"}
      </button>

      {showForm && (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h3 className="font-medium text-stone-900 mb-4">New expense</h3>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">TITLE *</label>
                <input
                  name="title"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                  placeholder="e.g. Gas to venue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">AMOUNT ($) *</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">CATEGORY *</label>
              <select
                name="category"
                required
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">NOTES</label>
              <textarea
                name="notes"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 resize-none"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">RECEIPT</label>
              <input
                name="receipt"
                type="file"
                accept="image/*,application/pdf"
                className="w-full text-sm text-stone-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200"
              />
              <p className="text-xs text-stone-500 mt-1">PDF or image, up to 10MB.</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Add expense"}
            </button>
          </form>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-center text-stone-500 py-8">No expenses yet.</p>
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
