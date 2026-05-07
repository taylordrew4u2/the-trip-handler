import { prisma } from "@/lib/db";
import { AdminItineraryClient } from "./AdminItineraryClient";

export const dynamic = "force-dynamic";

export default async function AdminItineraryPage() {
  const [trip, days] = await Promise.all([
    prisma.trip.findFirst(),
    prisma.day.findMany({ orderBy: { dayNumber: "asc" } }),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Itinerary &amp; meals</h1>
        <p className="text-stone-500 text-sm mt-1">
          Add a row per day. Each day gets a schedule and breakfast/lunch/dinner.
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
