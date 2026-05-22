import { prisma } from "@/lib/db";
import { AdminItineraryClient } from "./AdminItineraryClient";
import { getActiveTrip } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function AdminItineraryPage() {
  const trip = await getActiveTrip();
  const days = trip
    ? await prisma.day.findMany({
        where: { tripId: trip.id },
        orderBy: { dayNumber: "asc" },
        include: {
          itineraryItems: {
            orderBy: [{ pinned: "desc" }, { orderIndex: "asc" }],
          },
        },
      })
    : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Itinerary</h1>
        <p className="text-stone-500 text-sm mt-1">
          Manage day-by-day schedule. Each day holds itinerary items (time, title, location, description, notes).
        </p>
      </div>
      {trip ? (
        <AdminItineraryClient tripId={trip.id} days={days} />
      ) : (
        <p className="text-stone-500 text-sm">No trip yet.</p>
      )}
    </div>
  );
}
