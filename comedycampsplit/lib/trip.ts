import { prisma } from "@/lib/db";
import type { Trip } from "@prisma/client";

/**
 * Returns the trip currently flagged isActive. If no trip is flagged but
 * trips exist, flags the most recently created one and returns that.
 * Returns null only when there are no trips at all.
 */
export async function getActiveTrip(): Promise<Trip | null> {
  const active = await prisma.trip.findFirst({ where: { isActive: true } });
  if (active) return active;

  const fallback = await prisma.trip.findFirst({ orderBy: { createdAt: "desc" } });
  if (!fallback) return null;

  return prisma.trip.update({
    where: { id: fallback.id },
    data: { isActive: true },
  });
}

/**
 * Returns the trip the given user is associated with. If the user has no
 * tripId yet (legacy data), assigns them to the active trip and returns
 * that trip. Returns null only when there are no trips at all.
 */
export async function getUserTripOrActive(userId: string): Promise<Trip | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tripId: true },
  });

  if (user?.tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: user.tripId } });
    if (trip) return trip;
  }

  const active = await getActiveTrip();
  if (!active) return null;

  await prisma.user.update({
    where: { id: userId },
    data: { tripId: active.id },
  });
  return active;
}

/**
 * Trips that are accepting new applications. Used by the signup page so
 * applicants can pick which trip they want to join.
 */
export async function getOpenTrips(): Promise<Trip[]> {
  return prisma.trip.findMany({
    where: { isApplicationOpen: true },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });
}
