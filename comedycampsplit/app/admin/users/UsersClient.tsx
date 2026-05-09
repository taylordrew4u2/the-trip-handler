"use client";

import Link from "next/link";
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
  guestForm: {
    id: string;
    maxBudget: string | null;
    substanceFreeAck: boolean;
    locked: boolean;
    editRequested: boolean;
  } | null;
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

  const filterLabel: Record<string, string> = {
    ALL: "All",
    PENDING: "Pending",
    APPROVED: "Approved",
    PENDING_PAYMENT: "Payment due",
    CONFIRMED_PAID: "Paid",
    CANCELLED: "Cancelled",
  };

  const counts: Record<string, number> = { ALL: users.length };
  for (const u of users) counts[u.status] = (counts[u.status] ?? 0) + 1;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {["ALL", "PENDING", "APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID", "CANCELLED"].map((s) => {
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                active
                  ? "bg-stone-900 text-white"
                  : "bg-white text-stone-700 border border-stone-300 hover:bg-stone-100"
              }`}
            >
              {filterLabel[s]} <span className={active ? "text-stone-400" : "text-stone-400"}>· {counts[s] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filtered.map((user) => (
          <div key={user.id} className="bg-white rounded-xl border border-stone-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-stone-900">{user.name}</h3>
                  {user.username && <span className="text-sm text-stone-400">@{user.username}</span>}
                  <StatusBadge status={user.status} />
                </div>
                <p className="text-sm text-stone-500 mt-0.5">{user.email}{user.phone && ` · ${user.phone}`}</p>
                {user.bio && <p className="text-sm text-stone-500 mt-1 italic">&ldquo;{user.bio}&rdquo;</p>}
                {user.guestForm ? (
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-md bg-stone-900 text-stone-100 font-medium tabular-nums">
                      Max budget: {user.guestForm.maxBudget ?? "(blank)"}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                        user.guestForm.substanceFreeAck
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-red-100 text-red-900"
                      }`}
                    >
                      {user.guestForm.substanceFreeAck ? "Sober ✓" : "Sober: NOT AGREED"}
                    </span>
                    {user.guestForm.editRequested && (
                      <span className="text-xs px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 font-medium">
                        Edit requested
                      </span>
                    )}
                    <Link
                      href={`/admin/intake/${user.id}`}
                      className="text-xs px-2.5 py-1 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-100"
                    >
                      View full guest form →
                    </Link>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-amber-700 font-medium">⚠ No guest form submitted yet</p>
                )}
                {user.adminNotes && (
                  <p className="text-xs text-amber-800 mt-2 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    Note: {user.adminNotes}
                  </p>
                )}
                <p className="text-xs text-stone-400 mt-2">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                {user.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => handleAction("approve", user.id)}
                      disabled={loading === user.id + "approve"}
                      className="px-3 py-1.5 bg-stone-900 text-white rounded-md text-xs font-medium hover:bg-stone-800 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction("reject", user.id)}
                      disabled={loading === user.id + "reject"}
                      className="px-3 py-1.5 border border-red-300 text-red-700 rounded-md text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
                {(user.status === "APPROVED" || user.status === "PENDING_PAYMENT") && (
                  <button
                    onClick={() => handleAction("cancel", user.id)}
                    disabled={loading === user.id + "cancel"}
                    className="px-3 py-1.5 border border-red-300 text-red-700 rounded-md text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => { setSelected(user.id); setNote(user.adminNotes ?? ""); }}
                  className="px-3 py-1.5 border border-stone-300 text-stone-700 rounded-md text-xs font-medium hover:bg-stone-100"
                >
                  Note
                </button>
              </div>
            </div>

            {selected === user.id && (
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add admin note…"
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                />
                <button
                  onClick={() => handleNote(user.id)}
                  className="px-3 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800"
                >
                  Save
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="px-3 py-2 border border-stone-300 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-100"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-stone-400 py-8">No users with this status.</p>
        )}
      </div>
    </div>
  );
}
