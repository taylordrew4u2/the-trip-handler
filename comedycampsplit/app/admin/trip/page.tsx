import { prisma } from "@/lib/db";
import { TripClient } from "./TripClient";
import { LodgingPhotosClient } from "./LodgingPhotosClient";

export default async function AdminTripPage() {
  const trip =
    (await prisma.trip.findFirst()) ??
    (await prisma.trip.create({ data: { name: "Comedy Summer Camp" } }));

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
