import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardNav } from "@/components/DashboardNav";
import { SignOutLink } from "@/components/SignOutLink";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; status?: string } | undefined;
  if (!sessionUser?.id) redirect("/login");

  const membership = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      tripId: true,
      trip: { select: { disabledSections: true, ownerId: true } },
      _count: { select: { ownedTrips: true } },
    },
  });

  // A member who isn't a participant on any trip doesn't get dropped into one.
  // Owners go to their trip-management area; everyone else picks what to do
  // from the home screen (create a trip, take the tour, or enter a code).
  if (!membership?.tripId) {
    if ((membership?._count.ownedTrips ?? 0) > 0) redirect("/dashboard/my-trips");
    redirect("/dashboard/start");
  }

  // PENDING users with no form must finish the intake first.
  if (sessionUser.status === "PENDING") {
    const form = await prisma.guestForm.findUnique({ where: { userId: sessionUser.id } });
    if (!form) redirect("/dashboard/intake");
  }

  if (sessionUser.status === "CANCELLED") {
    return (
      <div className="min-h-dvh bg-[#faf8f3] flex items-center justify-center gutter py-10">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 max-w-md text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-600 mb-3">Cancelled</p>
          <h2 className="font-serif text-2xl font-medium text-slate-900 mb-3">You&apos;re not on the trip</h2>
          <p className="text-slate-600">
            Either you withdrew or the application wasn&apos;t approved. You can look for another
            trip, or reach out to the organizer if you want to come back.
          </p>
          <a
            href="/dashboard/start"
            className="inline-flex items-center justify-center mt-6 px-4 min-h-[44px] bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-medium"
          >
            Find another trip →
          </a>
          <div className="mt-6"><SignOutLink /></div>
        </div>
      </div>
    );
  }

  const isPending = sessionUser.status === "PENDING";
  // The owner joined their own trip: everything below is the guest view.
  const ownerTripId = membership.trip?.ownerId === sessionUser.id ? membership.tripId : null;

  return (
    <div className="min-h-dvh bg-[#faf8f3]">
      <DashboardNav status={sessionUser.status ?? null} disabledSections={membership.trip?.disabledSections ?? []} />
      <div className="2xl:pl-60">
      <main className="max-w-6xl mx-auto gutter py-8 md:py-10">
        {ownerTripId && (
          <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-teal-950">
              <strong>Guest view.</strong> You&apos;re seeing exactly what your guests see.
            </span>
            <a
              href={`/dashboard/my-trips/${ownerTripId}`}
              className="inline-flex items-center justify-center min-h-[44px] rounded-xl bg-teal-700 px-4 font-medium text-white hover:bg-teal-800"
            >
              Back to managing →
            </a>
          </div>
        )}
        {isPending && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 mb-6 text-sm text-amber-900 leading-relaxed">
            <strong>You&apos;re pending admin approval.</strong> You can browse the itinerary and
            lodging now, but the roster, contributions, payments, and other tools unlock once
            you&apos;re approved.
          </div>
        )}
        {children}
      </main>
      </div>
    </div>
  );
}
