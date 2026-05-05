"use server";

import { prisma } from "@/lib/db";
import { sendApprovalEmail, sendTripLockedEmail } from "@/lib/resend";
import { revalidatePath } from "next/cache";

export async function approveUser(userId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "APPROVED" },
  });
  try {
    await sendApprovalEmail(user.email, user.name);
  } catch (e) {
    console.error("Email failed:", e);
  }
  revalidatePath("/admin/users");
  revalidatePath("/dashboard/roster");
  return { success: true };
}

export async function rejectUser(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function cancelUser(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function addAdminNote(userId: string, note: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { adminNotes: note },
  });
  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateTrip(tripId: string, data: {
  name?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  itinerary?: string;
  lodging?: string;
  meals?: string;
  finalPrice?: number;
}) {
  await prisma.trip.update({
    where: { id: tripId },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
  revalidatePath("/admin/trip");
  revalidatePath("/dashboard/itinerary");
  return { success: true };
}

export async function lockTrip(tripId: string) {
  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: { isLocked: true, lockedAt: new Date() },
  });

  // Update approved users to PENDING_PAYMENT
  await prisma.user.updateMany({
    where: { status: "APPROVED" },
    data: { status: "PENDING_PAYMENT" },
  });

  // Send emails to all approved/pending_payment users
  if (trip.finalPrice) {
    const users = await prisma.user.findMany({
      where: { status: { in: ["PENDING_PAYMENT", "APPROVED"] }, role: "PARTICIPANT" },
    });
    for (const user of users) {
      try {
        await sendTripLockedEmail(user.email, user.name, trip.finalPrice);
      } catch (e) {
        console.error("Email failed:", e);
      }
    }
  }

  revalidatePath("/admin/trip");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function unlockTrip(tripId: string) {
  await prisma.trip.update({
    where: { id: tripId },
    data: { isLocked: false, lockedAt: null },
  });
  revalidatePath("/admin/trip");
  return { success: true };
}
