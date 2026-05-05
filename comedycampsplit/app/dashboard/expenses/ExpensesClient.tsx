"use client";

import { useState } from "react";
import { addExpense } from "@/app/actions/expenses";
import { ExpenseCard } from "@/components/ExpenseCard";

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

const CATEGORIES = ["Food", "Transport", "Lodging", "Activities", "Equipment", "Other"];

export function ExpensesClient({ expenses, tripId, userId }: {
  expenses: Expense[];
  tripId: string;
  userId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.append("tripId", tripId);
    formData.append("userId", userId);
    const result = await addExpense(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setShowForm(false);
      (e.target as HTMLFormElement).reset();
    }
  }

  const approved = expenses.filter((e) => e.approved);
  const pending = expenses.filter((e) => !e.approved);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {approved.length} approved • {pending.length} pending review
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700"
        >
          + Submit Expense
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-purple-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Submit an Expense</h2>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  name="title"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                  placeholder="e.g. Gas to venue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                name="category"
                required
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm resize-none"
                placeholder="Optional notes..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt (optional)</label>
              <input
                name="receipt"
                type="file"
                accept="image/*,application/pdf"
                className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              <p className="text-xs text-gray-500 mt-1">PDF or image, up to 10MB.</p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Expense"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">💸</div>
          <p>No expenses yet. Be the first to submit one!</p>
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
