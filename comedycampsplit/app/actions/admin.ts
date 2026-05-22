"use server";

import { prisma } from "@/lib/db";
import {
  sendApprovalEmail,
  sendCancellationEmail,
  sendRejectionEmail,
  sendTripLockedEmail,
} from "@/lib/resend";
import { COST_SHARE_DIVISOR } from "@/lib/pricing";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return (session?.user as { role?: string } | undefined)?.role === "ADMIN";
}

export async function approveUser(userId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
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
  if (!(await requireAdmin())) return { error: "Admin only." };
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "CANCELLED" },
  });
  await sendRejectionEmail(user.email, user.name);
  revalidatePath("/admin/users");
  return { success: true };
}

export async function cancelUser(userId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: "CANCELLED" },
  });
  // Free their bed and contributions so the slots reopen.
  await prisma.bedAssignment.deleteMany({ where: { userId } });
  await prisma.userContribution.deleteMany({ where: { userId } });
  await sendCancellationEmail(user.email, user.name);
  revalidatePath("/admin/users");
  revalidatePath("/admin/sleeping");
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

export async function addAdminNote(userId: string, note: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
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
}) {
  if (!(await requireAdmin())) return { error: "Admin only." };
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

export type PriceKind = "housing" | "transport" | "meals";

const PRICE_FIELDS: Record<PriceKind, { amount: "housingPrice" | "transportPrice" | "mealsPrice"; locked: "housingLocked" | "transportLocked" | "mealsLocked" }> = {
  housing: { amount: "housingPrice", locked: "housingLocked" },
  transport: { amount: "transportPrice", locked: "transportLocked" },
  meals: { amount: "mealsPrice", locked: "mealsLocked" },
};

export async function updateTripPriceLine(tripId: string, kind: PriceKind, amount: number | null) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { error: "Trip not found." };
  if (trip.isLocked) return { error: "Unlock the trip before editing prices." };
  const fields = PRICE_FIELDS[kind];
  if (trip[fields.locked]) return { error: "Unlock this price first." };
  if (amount !== null && (Number.isNaN(amount) || amount < 0)) return { error: "Amount must be a non-negative number." };

  await prisma.trip.update({
    where: { id: tripId },
    data: { [fields.amount]: amount },
  });
  revalidatePath("/admin/trip");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/payment");
  return { success: true };
}

export async function lockTripPriceLine(tripId: string, kind: PriceKind) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { error: "Trip not found." };
  const fields = PRICE_FIELDS[kind];
  if (trip[fields.amount] == null) return { error: "Set an amount before locking." };

  await prisma.trip.update({
    where: { id: tripId },
    data: { [fields.locked]: true },
  });

  // If all three lines are now locked, auto-solidify the trip:
  // - finalPrice is the per-person share (total ÷ COST_SHARE_DIVISOR)
  // - isLocked = true, APPROVED → PENDING_PAYMENT, emails sent to everyone
  const updated = await prisma.trip.findUnique({ where: { id: tripId } });
  if (
    updated &&
    updated.housingLocked &&
    updated.transportLocked &&
    updated.mealsLocked &&
    !updated.isLocked
  ) {
    const total =
      (updated.housingPrice ?? 0) +
      (updated.transportPrice ?? 0) +
      (updated.mealsPrice ?? 0);
    const share = total / COST_SHARE_DIVISOR;
    await prisma.trip.update({
      where: { id: tripId },
      data: { finalPrice: share, isLocked: true, lockedAt: new Date() },
    });
    await prisma.user.updateMany({
      where: { status: "APPROVED" },
      data: { status: "PENDING_PAYMENT" },
    });
    const users = await prisma.user.findMany({
      where: {
        status: { in: ["PENDING_PAYMENT", "APPROVED"] },
        role: "PARTICIPANT",
      },
    });
    for (const u of users) {
      try {
        await sendTripLockedEmail(u.email, u.name, share);
      } catch (e) {
        console.error("Email failed:", e);
      }
    }
  }

  revalidatePath("/admin/trip");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/payment");
  return { success: true };
}

export async function unlockTripPriceLine(tripId: string, kind: PriceKind) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { error: "Trip not found." };
  if (trip.isLocked) return { error: "Unlock the whole trip first." };
  const fields = PRICE_FIELDS[kind];
  await prisma.trip.update({
    where: { id: tripId },
    data: { [fields.locked]: false },
  });
  revalidatePath("/admin/trip");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function lockTrip(tripId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
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
  if (!(await requireAdmin())) return { error: "Admin only." };
  // Unlock the trip AND all three price lines so admin can edit again.
  await prisma.trip.update({
    where: { id: tripId },
    data: {
      isLocked: false,
      lockedAt: null,
      finalPrice: null,
      housingLocked: false,
      transportLocked: false,
      mealsLocked: false,
    },
  });
  revalidatePath("/admin/trip");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/payment");
  return { success: true };
}

// ---------- Multi-trip management ----------

export async function createTrip(name: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };

  const existingActive = await prisma.trip.findFirst({ where: { isActive: true } });

  const trip = await prisma.trip.create({
    data: {
      name: trimmed,
      isActive: !existingActive,
      isApplicationOpen: true,
    },
  });

  revalidatePath("/admin/trips");
  revalidatePath("/signup");
  return { success: true, tripId: trip.id };
}

export async function renameTrip(tripId: string, name: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };
  await prisma.trip.update({ where: { id: tripId }, data: { name: trimmed } });
  revalidatePath("/admin/trips");
  revalidatePath("/signup");
  return { success: true };
}

export async function setTripActive(tripId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  await prisma.$transaction([
    prisma.trip.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.trip.update({ where: { id: tripId }, data: { isActive: true } }),
  ]);
  revalidatePath("/admin/trips");
  revalidatePath("/admin");
  return { success: true };
}

export async function setTripApplicationOpen(tripId: string, open: boolean) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  await prisma.trip.update({
    where: { id: tripId },
    data: { isApplicationOpen: open },
  });
  revalidatePath("/admin/trips");
  revalidatePath("/signup");
  return { success: true };
}

export async function deleteTrip(tripId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const userCount = await prisma.user.count({ where: { tripId } });
  if (userCount > 0) {
    return {
      error: `Can't delete — ${userCount} member(s) are still attached to this trip. Reassign or remove them first.`,
    };
  }
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { isActive: true },
  });
  if (!trip) return { error: "Trip not found." };

  await prisma.trip.delete({ where: { id: tripId } });

  if (trip.isActive) {
    const fallback = await prisma.trip.findFirst({ orderBy: { createdAt: "desc" } });
    if (fallback) {
      await prisma.trip.update({ where: { id: fallback.id }, data: { isActive: true } });
    }
  }

  revalidatePath("/admin/trips");
  revalidatePath("/signup");
  return { success: true };
}
