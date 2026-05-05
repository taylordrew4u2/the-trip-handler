"use client";

import { useState } from "react";
import { approveUser, rejectUser, cancelUser, addAdminNote } from "@/app/actions/admin";
import { StatusBadge } from "@/components/StatusBadge";
import { UserStatus } from "@prisma/client";

interface UserRow {
  id: string;
  name: string;
  email: string;
  username: string | null;
  phone: string | null;
  status: UserStatus;
  bio: string | null;
  adminNotes: string | null;
  createdAt: Date;
  payments: { status: string; amount: number }[];
}

export function UsersClient({ users }: { users: UserRow[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = filter === "ALL" ? users : users.filter((u) => u.status === filter);

  async function handleAction(action: "approve" | "reject" | "cancel", userId: string) {
    setLoading(userId + action);
    if (action === "approve") await approveUser(userId);
    else if (action === "reject") await rejectUser(userId);
    else await cancelUser(userId);
    setLoading(null);
  }

  async function handleNote(userId: string) {
    await addAdminNote(userId, note);
    setSelected(null);
    setNote("");
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {["ALL", "PENDING", "APPROVED", "CONFIRMED_PAID", "PENDING_PAYMENT", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === s ? "bg-purple-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((user) => (
          <div key={user.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{user.name}</h3>
                  {user.username && <span className="text-sm text-gray-400">@{user.username}</span>}
                  <StatusBadge status={user.status} />
                </div>
                <p className="text-sm text-gray-500">{user.email}</p>
                {user.phone && <p className="text-sm text-gray-500">{user.phone}</p>}
                {user.bio && <p className="text-sm text-gray-400 mt-1 italic">&quot;{user.bio}&quot;</p>}
                {user.adminNotes && (
                  <p className="text-xs text-orange-600 mt-1">📝 Note: {user.adminNotes}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                {user.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => handleAction("approve", user.id)}
                      disabled={loading === user.id + "approve"}
                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 disabled:opacity-50"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleAction("reject", user.id)}
                      disabled={loading === user.id + "reject"}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 disabled:opacity-50"
                    >
                      ✗ Reject
                    </button>
                  </>
                )}
                {(user.status === "APPROVED" || user.status === "PENDING_PAYMENT") && (
                  <button
                    onClick={() => handleAction("cancel", user.id)}
                    disabled={loading === user.id + "cancel"}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => { setSelected(user.id); setNote(user.adminNotes ?? ""); }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200"
                >
                  📝 Note
                </button>
              </div>
            </div>

            {selected === user.id && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add admin note..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  onClick={() => handleNote(user.id)}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">No users with this status.</p>
        )}
      </div>
    </div>
  );
}
