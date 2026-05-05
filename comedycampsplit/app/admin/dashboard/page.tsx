import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const [trip, totalUsers, pendingUsers, approvedUsers, paidUsers, expenses] = await Promise.all([
    prisma.trip.findFirst(),
    prisma.user.count({ where: { role: "PARTICIPANT" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { status: { in: ["APPROVED", "PENDING_PAYMENT"] } } }),
    prisma.user.count({ where: { status: "CONFIRMED_PAID" } }),
    prisma.expense.count(),
  ]);

  const stats = [
    { label: "Total Applicants", value: totalUsers, color: "bg-blue-50 text-blue-700", href: "/admin/users" },
    { label: "Pending Approval", value: pendingUsers, color: "bg-yellow-50 text-yellow-700", href: "/admin/users" },
    { label: "Approved", value: approvedUsers, color: "bg-purple-50 text-purple-700", href: "/admin/users" },
    { label: "Confirmed & Paid", value: paidUsers, color: "bg-green-50 text-green-700", href: "/admin/users" },
    { label: "Total Expenses", value: expenses, color: "bg-orange-50 text-orange-700", href: "/admin/expenses" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Managing: {trip?.name ?? "Comedy Summer Camp"}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${trip?.isLocked ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {trip?.isLocked ? "🔒 Trip Locked" : "🔓 Trip Open"}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className={`${stat.color} rounded-2xl p-4 hover:opacity-80 transition-opacity`}>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm mt-1 opacity-80">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: "/admin/users", emoji: "👥", title: "Manage Users", desc: "Approve, reject, or cancel participants" },
          { href: "/admin/trip", emoji: "🏕️", title: "Trip Settings", desc: "Edit trip details, lock trip, set price" },
          { href: "/admin/expenses", emoji: "💸", title: "Expenses", desc: "Review and approve submitted expenses" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-purple-300 hover:shadow-sm transition-all"
          >
            <div className="text-3xl mb-3">{item.emoji}</div>
            <h3 className="font-semibold text-gray-900">{item.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
