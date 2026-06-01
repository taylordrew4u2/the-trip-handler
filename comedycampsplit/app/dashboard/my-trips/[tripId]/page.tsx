import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { TripEditForm } from "./TripEditForm";

export const dynamic = "force-dynamic";

function isoDate(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function ManageTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ownerId: userId },
  });
  if (!trip) redirect("/dashboard/my-trips");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/my-trips" className="text-xs text-stone-500 hover:text-stone-800">
          ← My trips
        </Link>
        <h1 className="font-serif text-3xl font-medium text-stone-900 mt-2">{trip.name}</h1>
        <p className="text-stone-500 text-sm mt-1">Edit the details people see on your invite page.</p>
      </div>
      <TripEditForm
        tripId={trip.id}
        initial={{
          name: trip.name,
          destination: trip.destination ?? "",
          startDate: isoDate(trip.startDate),
          endDate: isoDate(trip.endDate),
          description: trip.description ?? "",
          itinerary: trip.itinerary ?? "",
          lodging: trip.lodging ?? "",
          meals: trip.meals ?? "",
        }}
      />
    </div>
  );
}
