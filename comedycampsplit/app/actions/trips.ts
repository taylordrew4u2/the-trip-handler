"use server";

import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { sendApprovalEmail, sendRejectionEmail } from "@/lib/resend";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  // The env super-admin has the synthetic id "admin" and owns no trips.
  return id && id !== "admin" ? id : null;
}

/** Verify the signed-in user owns the given trip; returns it or null. */
async function ownedTrip(tripId: string, userId: string) {
  return prisma.trip.findFirst({ where: { id: tripId, ownerId: userId } });
}

/**
 * Any signed-in member can create a trip. They become its owner and get a
 * unique invite token to share. The trip is reachable only via that link.
 */
export async function createMyTrip(name: string) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in to create a trip." };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Give your trip a name." };

  const trip = await prisma.trip.create({
    data: {
      name: trimmed,
      ownerId: userId,
      inviteToken: randomBytes(12).toString("hex"),
      isApplicationOpen: true,
    },
  });

  revalidatePath("/dashboard/my-trips");
  return { success: true, tripId: trip.id };
}

/** Edit the descriptive fields of a trip you own. */
export async function updateMyTrip(
  tripId: string,
  data: {
    name?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    itinerary?: string;
    lodging?: string;
    meals?: string;
  },
) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  if (!(await ownedTrip(tripId, userId))) return { error: "Not your trip." };

  const name = data.name?.trim();
  if (name !== undefined && !name) return { error: "Trip name can't be empty." };

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      name: name || undefined,
      destination: data.destination?.trim() || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      description: data.description?.trim() || null,
      itinerary: data.itinerary?.trim() || null,
      lodging: data.lodging?.trim() || null,
      meals: data.meals?.trim() || null,
    },
  });

  revalidatePath("/dashboard/my-trips");
  revalidatePath(`/dashboard/my-trips/${tripId}`);
  return { success: true };
}

export async function setMyTripApplicationOpen(tripId: string, open: boolean) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  if (!(await ownedTrip(tripId, userId))) return { error: "Not your trip." };

  await prisma.trip.update({
    where: { id: tripId },
    data: { isApplicationOpen: open },
  });
  revalidatePath("/dashboard/my-trips");
  return { success: true };
}

/** An applicant belongs to a trip the caller owns — approve or reject them. */
async function ownsApplicant(applicantId: string, userId: string) {
  const applicant = await prisma.user.findUnique({
    where: { id: applicantId },
    select: { id: true, email: true, name: true, tripId: true },
  });
  if (!applicant?.tripId) return null;
  const trip = await ownedTrip(applicant.tripId, userId);
  return trip ? applicant : null;
}

export async function approveTripApplicant(applicantId: string) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  const applicant = await ownsApplicant(applicantId, userId);
  if (!applicant) return { error: "Not your applicant." };

  await prisma.user.update({
    where: { id: applicant.id },
    data: { status: "APPROVED" },
  });
  await sendApprovalEmail(applicant.email, applicant.name);
  revalidatePath("/dashboard/my-trips");
  return { success: true };
}

export async function rejectTripApplicant(applicantId: string) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  const applicant = await ownsApplicant(applicantId, userId);
  if (!applicant) return { error: "Not your applicant." };

  await prisma.user.update({
    where: { id: applicant.id },
    data: { status: "CANCELLED" },
  });
  await sendRejectionEmail(applicant.email, applicant.name);
  revalidatePath("/dashboard/my-trips");
  return { success: true };
}

/**
 * A signed-in member applies to a trip via its invite token. Sets their
 * tripId and resets them to PENDING so the owner can review.
 */
export async function applyToTrip(token: string) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in to apply." };

  const trip = await prisma.trip.findUnique({ where: { inviteToken: token } });
  if (!trip || !trip.isApplicationOpen) {
    return { error: "This invite isn't accepting applications." };
  }
  if (trip.ownerId === userId) {
    return { error: "You own this trip — you can't apply to it." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { tripId: trip.id, status: "PENDING" },
  });
  revalidatePath("/dashboard");
  return { success: true };
}
