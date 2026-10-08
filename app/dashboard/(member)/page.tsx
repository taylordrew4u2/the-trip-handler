import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WithdrawButton } from "@/components/WithdrawButton";
import { PageNote } from "@/components/PageNote";
import { getUserTrip } from "@/lib/trip";
import { StatusBadge } from "@/components/StatusBadge";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  const trip = userId && userId !== "admin" ? await getUserTrip(userId) : null;
  const rosterFilter = trip
    ? { tripId: trip.id, role: "PARTICIPANT" as const }
    : { role: "PARTICIPANT" as const };

  const [user, totalApproved, totalPaid, guestForm] = await Promise.all([
    userId && userId !== "admin" ? prisma.user.findUnique({ where: { id: userId } }) : null,
    prisma.user.count({
      where: { ...rosterFilter, status: { in: ["APPROVED", "CONFIRMED_PAID", "PENDING_PAYMENT"] } },
    }),
    prisma.user.count({ where: { ...rosterFilter, status: "CONFIRMED_PAID" } }),
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
      <PageNote pageKey="dashboard" />
      <header className="rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-lg sm:p-8 md:p-10">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">
          {trip?.isLocked ? "Plan locked" : "Your trip overview"}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium leading-tight break-words">
          {trip?.name ?? "Your trip"}
        </h1>
        {(trip?.destination || dateRange) && (
          <p className="text-slate-300 mt-3 text-sm sm:text-base">
            {trip?.destination}
            {trip?.destination && dateRange && " · "}
            {dateRange}
          </p>
        )}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 mt-6">
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5">
            <p className="text-xl font-semibold tabular-nums">{totalApproved}</p>
            <p className="text-xs uppercase tracking-wide text-slate-400 mt-0.5">Approved</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5">
            <p className="text-xl font-semibold tabular-nums">{totalPaid}</p>
            <p className="text-xs uppercase tracking-wide text-slate-400 mt-0.5">Paid</p>
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
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-amber-800">Action required</p>
          <h2 className="font-serif text-xl font-medium text-slate-900 mt-1">Fill out your guest form</h2>
          <p className="text-sm text-slate-700 mt-2 leading-relaxed">
            Admin reviews your guest form before approving you for the trip.
          </p>
          <a href="/dashboard/intake" className="inline-flex items-center justify-center mt-4 px-4 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-sm font-medium">
            Open the guest form →
          </a>
        </div>
      )}

      {user && guestForm && !guestForm.preferencesSubmittedAt && user.status !== "PENDING" && user.status !== "CANCELLED" && (
        <div className="bg-blue-50 border border-blue-300 rounded-2xl p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.15em] text-blue-800">Next step</p>
          <h2 className="font-serif text-xl font-medium text-slate-900 mt-1">Fill out your trip preferences</h2>
          <p className="text-sm text-slate-700 mt-2 leading-relaxed">
            Now that you&apos;re approved, share your emergency contact, transportation, food, and activity
            preferences so the trip can actually be planned.
          </p>
          <a href="/dashboard/preferences" className="inline-flex items-center justify-center mt-4 px-4 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-sm font-medium">
            Fill out preferences →
          </a>
        </div>
      )}

      {user && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <h2 className="font-medium text-slate-900">Welcome back, {user.name}.</h2>
          <p className="text-slate-600 text-sm mt-1">
            <StatusBadge status={user.status} />
            {guestForm && (
              <>
                {" · "}
                <a href="/dashboard/intake" className="underline underline-offset-2 hover:text-slate-900">Edit your guest form</a>
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
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <h2 className="text-xs uppercase tracking-[0.15em] text-slate-600 mb-2">About</h2>
          <p className="text-slate-700 leading-relaxed">{trip.description}</p>
        </div>
      )}

      <section aria-labelledby="trip-tools-title">
      <h2 id="trip-tools-title" className="mb-4 text-lg font-semibold tracking-tight text-slate-950">Explore the plan</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { href: "/dashboard/itinerary", label: "Itinerary", detail: "See what happens each day.", show: true },
          { href: "/dashboard/lodging", label: "Lodging", detail: "Get to know your home base.", show: true },
          { href: "/dashboard/roster", label: "Roster", detail: "Meet everyone coming along.", show: user?.status !== "PENDING" },
          { href: "/dashboard/meals", label: "Meals", detail: "Vote, cook, and share the prep.", show: user?.status !== "PENDING" },
          { href: "/dashboard/sleeping", label: "Sleeping", detail: "Choose a bed and settle in.", show: user?.status !== "PENDING" },
          { href: "/dashboard/contributions", label: "Contributions", detail: "Claim something to bring.", show: user?.status !== "PENDING" },
        ]
          .filter((item) => item.show)
          .map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group flex min-h-[132px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 sm:p-5"
            >
              <div>
                <p className="font-semibold text-slate-900 text-sm">{item.label}</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">{item.detail}</p>
              </div>
              <p className="mt-4 text-sm font-medium text-indigo-700">Open <span aria-hidden="true">→</span></p>
            </a>
          ))}
      </div>
      </section>

      {user && user.status !== "CANCELLED" && (
        <div className="border-t border-slate-200 pt-6">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-600 mb-2">Need to drop out?</p>
          <p className="text-sm text-slate-600 mb-3">
            Life happens. You can pull out before paying — your bed and contributions get released
            so someone else can take your spot.
          </p>
          <WithdrawButton canWithdraw={user.status !== "CONFIRMED_PAID"} />
        </div>
      )}
    </div>
  );
}
