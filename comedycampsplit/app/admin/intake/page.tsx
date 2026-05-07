import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminIntakeIndexPage() {
  const users = await prisma.user.findMany({
    where: { role: "PARTICIPANT" },
    orderBy: [{ name: "asc" }],
    include: { guestForm: { select: { id: true, updatedAt: true, locked: true, editRequested: true } } },
  });

  const submitted = users.filter((u) => u.guestForm);
  const missing = users.filter((u) => !u.guestForm);
  const editRequested = submitted.filter((u) => u.guestForm!.editRequested);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Guest forms</h1>
        <p className="text-stone-500 text-sm mt-1">
          {submitted.length} of {users.length} participants have submitted.
          {editRequested.length > 0 && (
            <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-medium">
              {editRequested.length} edit request{editRequested.length > 1 ? "s" : ""} pending
            </span>
          )}
        </p>
      </div>

      {missing.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.15em] text-stone-500 mb-3">Not submitted ({missing.length})</h2>
          <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-200">
            {missing.map((u) => (
              <div key={u.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-stone-900">{u.name}</p>
                  <p className="text-xs text-stone-500">{u.email}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-900">Pending</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {submitted.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-[0.15em] text-stone-500 mb-3">Submitted ({submitted.length})</h2>
          <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-200">
            {submitted.map((u) => (
              <Link
                key={u.id}
                href={`/admin/intake/${u.id}`}
                className="px-4 py-3 flex items-center justify-between hover:bg-stone-50"
              >
                <div>
                  <p className="font-medium text-stone-900">{u.name}</p>
                  <p className="text-xs text-stone-500">
                    {u.email} · updated {new Date(u.guestForm!.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {u.guestForm!.editRequested && (
                    <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-900 font-medium">
                      Edit requested
                    </span>
                  )}
                  {!u.guestForm!.locked && (
                    <span className="text-xs px-2 py-1 rounded bg-stone-100 text-stone-700">
                      Unlocked
                    </span>
                  )}
                  <span className="text-xs text-stone-500">View →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {users.length === 0 && (
        <p className="text-sm text-stone-500">No participants yet.</p>
      )}
    </div>
  );
}
