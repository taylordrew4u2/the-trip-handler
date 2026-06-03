import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardNav } from "@/components/DashboardNav";
import { SignOutLink } from "@/components/SignOutLink";
import { getUserTripOrActive } from "@/lib/trip";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; status?: string } | undefined;
  if (!sessionUser?.id) redirect("/login");

  // A member who hosts a trip but isn't a participant on any trip belongs in
  // their own trip-management area, not the participant intake flow.
  const membership = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { tripId: true, _count: { select: { ownedTrips: true } } },
  });
  if (!membership?.tripId && (membership?._count.ownedTrips ?? 0) > 0) {
    redirect("/dashboard/my-trips");
  }

  // Make sure legacy participants without a tripId get attached to the active trip.
  await getUserTripOrActive(sessionUser.id);

  // PENDING users with no form must finish the intake first.
  if (sessionUser.status === "PENDING") {
    const form = await prisma.guestForm.findUnique({ where: { userId: sessionUser.id } });
    if (!form) redirect("/dashboard/intake");
  }

  if (sessionUser.status === "CANCELLED") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-stone-200 p-8 max-w-md text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-3">Cancelled</p>
          <h2 className="font-serif text-2xl font-medium text-stone-900 mb-3">You&apos;re not on the trip</h2>
          <p className="text-stone-600">
            Either you withdrew or the application wasn&apos;t approved. Reach out to admin if you
            want to come back.
          </p>
          <div className="mt-6"><SignOutLink /></div>
        </div>
      </div>
    );
  }

  const isPending = sessionUser.status === "PENDING";

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav status={sessionUser.status ?? null} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {isPending && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-6 text-sm text-amber-900">
            <strong>You&apos;re pending admin approval.</strong> You can browse the itinerary and
            lodging now, but the roster, contributions, payments, and other tools unlock once
            you&apos;re approved.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
