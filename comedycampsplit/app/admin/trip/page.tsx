import { prisma } from "@/lib/db";
import { TripClient } from "./TripClient";

export default async function AdminTripPage() {
  const trip = await prisma.trip.findFirst() ?? await prisma.trip.create({
    data: { name: "Comedy Summer Camp" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">🏕️ Trip Settings</h1>
      <TripClient trip={trip} />
    </div>
  );
}
