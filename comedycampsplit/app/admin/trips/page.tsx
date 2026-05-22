import { prisma } from "@/lib/db";
import { AdminTripsClient } from "./AdminTripsClient";

export const dynamic = "force-dynamic";

export default async function AdminTripsPage() {
  const trips = await prisma.trip.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { users: true } },
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Trips</h1>
        <p className="text-stone-500 text-sm mt-1">
          Create and manage trips. The <strong>active</strong> trip is what admin pages (itinerary,
          meals, lodging, expenses) default to. <strong>Open for applications</strong> controls which
          trips show up on the public signup page.
        </p>
      </div>

      <AdminTripsClient
        trips={trips.map((t) => ({
          id: t.id,
          name: t.name,
          destination: t.destination,
          startDate: t.startDate,
          endDate: t.endDate,
          isActive: t.isActive,
          isApplicationOpen: t.isApplicationOpen,
          isLocked: t.isLocked,
          memberCount: t._count.users,
        }))}
      />
    </div>
  );
}
