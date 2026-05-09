import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [
    trip,
    totalUsers,
    pendingUsers,
    approvedUsers,
    paidUsers,
    pendingForms,
    editRequests,
  ] = await Promise.all([
    prisma.trip.findFirst(),
    prisma.user.count({ where: { role: "PARTICIPANT" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { status: { in: ["APPROVED", "PENDING_PAYMENT"] } } }),
    prisma.user.count({ where: { status: "CONFIRMED_PAID" } }),
    prisma.user.count({
      where: { status: "PENDING", guestForm: { is: null } },
    }),
    prisma.guestForm.count({ where: { editRequested: true } }),
  ]);

  const stats = [
    { label: "Total applicants", value: totalUsers, href: "/admin/users" },
    { label: "Pending approval", value: pendingUsers, href: "/admin/users" },
    { label: "Approved", value: approvedUsers, href: "/admin/users" },
    { label: "Confirmed & paid", value: paidUsers, href: "/admin/users" },
  ];

  const queues: { label: string; count: number; href: string }[] = [];
  if (pendingUsers > 0) {
    queues.push({
      label: pendingUsers === 1 ? "1 application waiting on review" : `${pendingUsers} applications waiting on review`,
      count: pendingUsers,
      href: "/admin/users",
    });
  }
  if (editRequests > 0) {
    queues.push({
      label:
        editRequests === 1
          ? "1 user requested edit access to their guest form"
          : `${editRequests} users requested edit access to their guest forms`,
      count: editRequests,
      href: "/admin/intake",
    });
  }
  if (pendingForms > 0) {
    queues.push({
      label:
        pendingForms === 1
          ? "1 user signed up but hasn't submitted the guest form"
          : `${pendingForms} users signed up but haven't submitted the guest form`,
      count: pendingForms,
      href: "/admin/users",
    });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-medium text-stone-900">Admin dashboard</h1>
          <p className="text-stone-500 text-sm mt-1">Managing {trip?.name ?? "Comedy Summer Camp"}.</p>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-md font-medium ${
            trip?.isLocked ? "bg-emerald-100 text-emerald-900" : "bg-stone-100 text-stone-700"
          }`}
        >
          {trip?.isLocked ? "Trip locked" : "Trip open"}
        </span>
      </div>

      {queues.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-[0.15em] text-stone-500">Needs attention</h2>
          {queues.map((q) => (
            <Link
              key={q.href + q.label}
              href={q.href}
              className="flex items-center justify-between bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 hover:bg-amber-100"
            >
              <span className="text-sm text-amber-900">{q.label}</span>
              <span className="text-xs text-amber-900 font-medium">View →</span>
            </Link>
          ))}
        </section>
      )}

      <section>
        <h2 className="text-xs uppercase tracking-[0.15em] text-stone-500 mb-3">At a glance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-900 transition-colors"
            >
              <p className="text-2xl font-semibold text-stone-900 tabular-nums">{stat.value}</p>
              <p className="text-xs uppercase tracking-wide text-stone-500 mt-1">{stat.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.15em] text-stone-500 mb-3">Quick links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { href: "/admin/users", title: "Manage users", desc: "Approve, reject, cancel applicants." },
            { href: "/admin/intake", title: "Guest forms", desc: "Read what people submitted; unlock for edits." },
            { href: "/admin/itinerary", title: "Itinerary", desc: "Add and edit per-day schedule and meals." },
            { href: "/admin/sleeping", title: "Sleeping", desc: "Add beds and review who's in each." },
            { href: "/admin/meals", title: "Meals & dietary", desc: "Allergies and restrictions across the group." },
            { href: "/admin/trip", title: "Trip settings", desc: "Lock the trip, set price, edit lodging." },
            { href: "/admin/contributions", title: "Contributions", desc: "Suggest items members can claim." },
            { href: "/admin/roster", title: "Full roster", desc: "Searchable table + CSV export." },
            { href: "/admin/diagnostics", title: "Diagnostics", desc: "Integration & env status." },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white rounded-xl border border-stone-200 p-4 hover:border-stone-900 transition-colors"
            >
              <p className="font-medium text-stone-900">{item.title}</p>
              <p className="text-sm text-stone-500 mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
