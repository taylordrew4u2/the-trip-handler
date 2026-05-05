"use client";

import { useState } from "react";
import { addContribution, deleteContributionItem } from "@/app/actions/contributions";

interface Contribution {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  users: { userId: string; user: { name: string; username: string | null }; notes: string | null }[];
}

export function AdminContributionsClient({ contributions, tripId }: {
  contributions: Contribution[];
  tripId: string;
}) {
  const [items, setItems] = useState(contributions);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("tripId", tripId);
    await addContribution(formData);
    setLoading(false);
    setShowForm(false);
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this contribution item?")) return;
    await deleteContributionItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm(!showForm)}
        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700"
      >
        + Add Item
      </button>

      {showForm && (
        <div className="bg-white rounded-2xl border border-purple-200 p-6">
          <form onSubmit={handleAdd} className="space-y-4">
            <h3 className="font-semibold text-gray-900">New Contribution Item</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  name="title"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="e.g. Bring snacks"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  name="category"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="e.g. Food"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                name="description"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Optional details"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add Item"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No contribution items yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    {item.category && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-700">{item.category}</span>
                    )}
                  </div>
                  {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                  {item.users.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.users.map((uc) => (
                        <span key={uc.userId} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                          {uc.user.username ? `@${uc.user.username}` : uc.user.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{item.users.length} signed up</p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
