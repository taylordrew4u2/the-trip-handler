import { prisma } from "@/lib/db";
import { TripClient } from "./TripClient";
import { LodgingPhotosClient } from "./LodgingPhotosClient";
import { getActiveTrip } from "@/lib/trip";

export default async function AdminTripPage() {
  const trip =
    (await getActiveTrip()) ??
    (await prisma.trip.create({ data: { name: "Untitled Trip", isActive: true } }));

  const photos = await prisma.lodgingPhoto.findMany({
    where: { tripId: trip.id },
    orderBy: { position: "asc" },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="font-serif text-3xl font-medium text-stone-900">Trip settings</h1>
      <TripClient trip={trip} />
      <LodgingPhotosClient tripId={trip.id} photos={photos} />
    </div>
  );
}
