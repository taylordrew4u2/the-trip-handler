"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addContribution, deleteContributionItem } from "@/app/actions/contributions";

interface Contribution {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  users: { userId: string; user: { name: string; username: string | null }; notes: string | null }[];
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900";

export function AdminContributionsClient({ contributions, tripId }: {
  contributions: Contribution[];
  tripId: string;
}) {
  const router = useRouter();
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
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this contribution item?")) return;
    await deleteContributionItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800"
        >
          + Add suggestion
        </button>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h3 className="font-medium text-stone-900 mb-4">New contribution suggestion</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">TITLE *</label>
                <input name="title" required className={inputCls} placeholder="e.g. Bring snacks" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">CATEGORY</label>
                <input name="category" className={inputCls} placeholder="e.g. Food" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">DESCRIPTION</label>
              <input name="description" className={inputCls} placeholder="Optional details" />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
              >
                {loading ? "Adding…" : "Add suggestion"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-stone-500 text-sm">No contribution items yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-stone-900">{item.title}</h3>
                    {item.category && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">{item.category}</span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 tabular-nums">
                      {item.users.length} signed up
                    </span>
                  </div>
                  {item.description && <p className="text-sm text-stone-600 mt-1">{item.description}</p>}
                  {item.users.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.users.map((uc) => (
                        <span key={uc.userId} className="text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                          {uc.user.username ? `@${uc.user.username}` : uc.user.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-xs px-3 py-1 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
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
