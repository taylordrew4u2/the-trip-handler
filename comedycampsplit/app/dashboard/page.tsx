import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  const [user, trip, totalApproved, totalPaid] = await Promise.all([
    userId && userId !== "admin" ? prisma.user.findUnique({ where: { id: userId } }) : null,
    prisma.trip.findFirst(),
    prisma.user.count({ where: { status: { in: ["APPROVED", "CONFIRMED_PAID", "PENDING_PAYMENT"] }, role: "PARTICIPANT" } }),
    prisma.user.count({ where: { status: "CONFIRMED_PAID", role: "PARTICIPANT" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          🎪 {trip?.name ?? "Comedy Summer Camp"}
        </h1>
        {trip?.destination && (
          <p className="text-purple-100 text-lg">📍 {trip.destination}</p>
        )}
        {(trip?.startDate || trip?.endDate) && (
          <p className="text-purple-100 mt-1">
            📅{" "}
            {trip.startDate && new Date(trip.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            {trip.startDate && trip.endDate && " – "}
            {trip.endDate && new Date(trip.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
        <div className="flex gap-6 mt-4">
          <div className="bg-white/20 rounded-2xl px-4 py-3">
            <p className="text-2xl font-bold">{totalApproved}</p>
            <p className="text-sm text-purple-100">Approved</p>
          </div>
          <div className="bg-white/20 rounded-2xl px-4 py-3">
            <p className="text-2xl font-bold">{totalPaid}</p>
            <p className="text-sm text-purple-100">Confirmed & Paid</p>
          </div>
          {trip?.isLocked && (
            <div className="bg-green-400/30 rounded-2xl px-4 py-3">
              <p className="text-2xl font-bold">🔒</p>
              <p className="text-sm text-purple-100">Trip Locked</p>
            </div>
          )}
        </div>
      </div>

      {user && (
        <div className="bg-white rounded-2xl border border-purple-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Welcome back, {user.name}! 👋</h2>
          <p className="text-gray-500 text-sm">Status: <span className="font-medium text-purple-700">{user.status.replace("_", " ")}</span></p>
          {user.status === "PENDING_PAYMENT" && trip?.isLocked && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
              💰 The trip is locked and payment is due. Head to the <a href="/dashboard/payment" className="underline font-medium">Payment page</a> to confirm your spot!
            </div>
          )}
        </div>
      )}

      {trip?.description && (
        <div className="bg-white rounded-2xl border border-purple-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">About the Trip</h2>
          <p className="text-gray-600">{trip.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: "/dashboard/roster", emoji: "👥", label: "Roster" },
          { href: "/dashboard/itinerary", emoji: "🗓️", label: "Itinerary" },
          { href: "/dashboard/expenses", emoji: "💸", label: "Expenses" },
          { href: "/dashboard/contributions", emoji: "🎭", label: "Contributions" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="bg-white rounded-2xl border border-purple-100 p-5 text-center hover:border-purple-300 hover:shadow-sm transition-all"
          >
            <div className="text-3xl mb-2">{item.emoji}</div>
            <p className="font-medium text-gray-800 text-sm">{item.label}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
