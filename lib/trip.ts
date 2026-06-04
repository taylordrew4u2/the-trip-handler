import { prisma } from "@/lib/db";
import type { Trip } from "@prisma/client";

/**
 * Returns the trip currently flagged isActive. If no trip is flagged but
 * trips exist, flags the most recently created one and returns that.
 * Returns null only when there are no trips at all.
 *
 * Used for ambient display (e.g. the login screen) — NOT for deciding which
 * trip a signed-in member belongs to. Membership is read with getUserTrip.
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
 * Returns the trip the given user is a participant of, or null if they aren't
 * on one yet. Unlike a fallback-to-active lookup, this never attaches the user
 * to a trip they didn't choose — a member with no trip belongs on the home
 * screen, not silently dropped into whatever trip happens to be active.
 */
export async function getUserTrip(userId: string): Promise<Trip | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tripId: true },
  });
  if (!user?.tripId) return null;
  return prisma.trip.findUnique({ where: { id: user.tripId } });
}

/** Look up a trip by its shareable invite token. */
export async function getTripByInviteToken(token: string): Promise<Trip | null> {
  if (!token) return null;
  return prisma.trip.findUnique({ where: { inviteToken: token } });
}

/**
 * Look up a trip by its short, owner-issued join code. Codes are matched
 * case-insensitively so members can type them however they like.
 */
export async function getTripByJoinCode(code: string): Promise<Trip | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  return prisma.trip.findUnique({ where: { joinCode: normalized } });
}
