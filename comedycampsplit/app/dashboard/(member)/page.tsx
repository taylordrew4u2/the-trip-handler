import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  const [user, trip, totalApproved, totalPaid, guestForm] = await Promise.all([
    userId && userId !== "admin" ? prisma.user.findUnique({ where: { id: userId } }) : null,
    prisma.trip.findFirst(),
    prisma.user.count({ where: { status: { in: ["APPROVED", "CONFIRMED_PAID", "PENDING_PAYMENT"] }, role: "PARTICIPANT" } }),
    prisma.user.count({ where: { status: "CONFIRMED_PAID", role: "PARTICIPANT" } }),
    userId && userId !== "admin" ? prisma.guestForm.findUnique({ where: { userId } }) : null,
  ]);

  const dateRange =
    trip?.startDate || trip?.endDate
      ? [
          trip.startDate && new Date(trip.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          trip.endDate && new Date(trip.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        ]
          .filter(Boolean)
          .join(" – ")
      : null;

  return (
    <div className="space-y-8">
      <header className="bg-stone-900 text-stone-100 rounded-2xl p-8 md:p-10">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400 mb-3">
          {trip?.isLocked ? "Locked · Payment due" : "The Roster"}
        </p>
        <h1 className="font-serif text-4xl md:text-5xl font-medium leading-tight">
          {trip?.name ?? "Comedy Summer Camp"}
        </h1>
        {(trip?.destination || dateRange) && (
          <p className="text-stone-300 mt-3 text-base">
            {trip?.destination}
            {trip?.destination && dateRange && " · "}
            {dateRange}
          </p>
        )}
        <div className="flex flex-wrap gap-3 mt-6">
          <div className="bg-stone-800/60 border border-stone-700 rounded-lg px-4 py-2.5">
            <p className="text-xl font-semibold tabular-nums">{totalApproved}</p>
            <p className="text-xs uppercase tracking-wide text-stone-400 mt-0.5">Approved</p>
          </div>
          <div className="bg-stone-800/60 border border-stone-700 rounded-lg px-4 py-2.5">
            <p className="text-xl font-semibold tabular-nums">{totalPaid}</p>
            <p className="text-xs uppercase tracking-wide text-stone-400 mt-0.5">Confirmed</p>
          </div>
          {trip?.isLocked && (
            <div className="bg-emerald-900/40 border border-emerald-700/60 rounded-lg px-4 py-2.5">
              <p className="text-xl font-semibold text-emerald-300">Locked</p>
              <p className="text-xs uppercase tracking-wide text-emerald-400/80 mt-0.5">Status</p>
            </div>
          )}
        </div>
      </header>

      {user && !guestForm && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-amber-800">Action required</p>
          <h2 className="font-serif text-xl font-medium text-stone-900 mt-1">Fill out your guest form</h2>
          <p className="text-sm text-stone-700 mt-2 leading-relaxed">
            We need your transportation, sleeping, food, allergy, and content preferences to plan the weekend.
          </p>
          <a href="/dashboard/intake" className="inline-block mt-4 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-medium">
            Open the guest form →
          </a>
        </div>
      )}

      {user && (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="font-medium text-stone-900">Welcome back, {user.name}.</h2>
          <p className="text-stone-500 text-sm mt-1">
            Status: <span className="font-medium text-stone-900">{user.status.replace("_", " ").toLowerCase()}</span>
            {guestForm && (
              <>
                {" · "}
                <a href="/dashboard/intake" className="underline underline-offset-2 hover:text-stone-900">Edit your guest form</a>
              </>
            )}
          </p>
          {user.status === "PENDING_PAYMENT" && trip?.isLocked && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              The trip is locked and payment is due. Your trip share <strong>plus the refundable
              $75 security deposit</strong> are billed together.{" "}
              <a href="/dashboard/payment" className="underline underline-offset-2 font-medium">
                Confirm your spot →
              </a>
            </div>
          )}
        </div>
      )}

      {trip?.description && (
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-xs uppercase tracking-[0.15em] text-stone-500 mb-2">About</h2>
          <p className="text-stone-700 leading-relaxed">{trip.description}</p>
        </div>
      )}

      {user?.status !== "PENDING" && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/dashboard/roster", label: "Roster" },
          { href: "/dashboard/itinerary", label: "Itinerary" },
          { href: "/dashboard/expenses", label: "Expenses" },
          { href: "/dashboard/contributions", label: "Contributions" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="group bg-white rounded-xl border border-stone-200 p-5 hover:border-stone-900 transition-colors"
          >
            <p className="font-medium text-stone-900 text-sm">{item.label}</p>
            <p className="text-xs text-stone-500 mt-1 group-hover:text-stone-900">View →</p>
          </a>
        ))}
      </div>
      )}
    </div>
  );
}
