"use client";

import { useState, useTransition } from "react";
import {
  approveAdminRequest,
  rejectAdminRequest,
  revokeAdmin,
} from "@/app/actions/adminAccess";

type Person = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

export function AdminsClient({
  pending,
  admins,
}: {
  pending: Person[];
  admins: Person[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function run(action: () => Promise<{ error?: string } | void>) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          Pending requests {pending.length > 0 && `(${pending.length})`}
        </h2>
        {pending.length === 0 ? (
          <p className="text-stone-400 text-sm">No pending admin requests.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between bg-white rounded-xl border border-stone-200 px-4 py-3"
              >
                <div>
                  <p className="text-stone-900 text-sm font-medium">{p.name}</p>
                  <p className="text-stone-500 text-xs">{p.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => run(() => approveAdminRequest(p.id))}
                    className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => run(() => rejectAdminRequest(p.id))}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-medium disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          Current admins ({admins.length})
        </h2>
        <ul className="space-y-2">
          {admins.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between bg-white rounded-xl border border-stone-200 px-4 py-3"
            >
              <div>
                <p className="text-stone-900 text-sm font-medium">{a.name}</p>
                <p className="text-stone-500 text-xs">{a.email}</p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  if (confirm(`Revoke admin access for ${a.name}?`)) {
                    run(() => revokeAdmin(a.id));
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-medium disabled:opacity-50"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
        <p className="text-stone-400 text-xs">
          The bootstrap admin is configured in the environment and isn&apos;t listed here.
        </p>
      </section>
    </div>
  );
}
