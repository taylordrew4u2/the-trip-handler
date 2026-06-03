"use server";

import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { deleteBlob } from "@/lib/blob";
import { sendApprovalEmail, sendRejectionEmail, sendTripLockedEmail } from "@/lib/resend";
import { COST_SHARE_DIVISOR } from "@/lib/pricing";
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

// ---------- pricing (owner-scoped) ----------

export type PriceKind = "housing" | "transport" | "meals";

const PRICE_FIELDS: Record<
  PriceKind,
  {
    amount: "housingPrice" | "transportPrice" | "mealsPrice";
    locked: "housingLocked" | "transportLocked" | "mealsLocked";
  }
> = {
  housing: { amount: "housingPrice", locked: "housingLocked" },
  transport: { amount: "transportPrice", locked: "transportLocked" },
  meals: { amount: "mealsPrice", locked: "mealsLocked" },
};

/** Set one of the three cost lines on a trip you own. */
export async function updateMyTripPrice(
  tripId: string,
  kind: PriceKind,
  amount: number | null,
) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  const trip = await ownedTrip(tripId, userId);
  if (!trip) return { error: "Not your trip." };
  if (trip.isLocked) return { error: "Unlock the trip before editing prices." };

  const fields = PRICE_FIELDS[kind];
  if (trip[fields.locked]) return { error: "Unlock this line first." };
  if (amount !== null && (Number.isNaN(amount) || amount < 0)) {
    return { error: "Amount must be a non-negative number." };
  }

  await prisma.trip.update({
    where: { id: tripId },
    data: { [fields.amount]: amount },
  });
  revalidatePath(`/dashboard/my-trips/${tripId}`);
  return { success: true };
}

/**
 * Lock one cost line. When all three lock, the trip auto-solidifies: the
 * per-person share is computed, the trip locks, this trip's approved
 * participants move to PENDING_PAYMENT, and each gets a payment email.
 */
export async function lockMyTripPrice(tripId: string, kind: PriceKind) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  const trip = await ownedTrip(tripId, userId);
  if (!trip) return { error: "Not your trip." };

  const fields = PRICE_FIELDS[kind];
  if (trip[fields.amount] == null) return { error: "Set an amount before locking." };

  await prisma.trip.update({
    where: { id: tripId },
    data: { [fields.locked]: true },
  });

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
    // Scope status changes and emails to THIS trip's participants only.
    await prisma.user.updateMany({
      where: { tripId, status: "APPROVED" },
      data: { status: "PENDING_PAYMENT" },
    });
    const participants = await prisma.user.findMany({
      where: { tripId, status: { in: ["PENDING_PAYMENT", "APPROVED"] } },
    });
    for (const p of participants) {
      try {
        await sendTripLockedEmail(p.email, p.name, share);
      } catch (e) {
        console.error("Email failed:", e);
      }
    }
  }

  revalidatePath(`/dashboard/my-trips/${tripId}`);
  revalidatePath("/dashboard/payment");
  return { success: true };
}

export async function unlockMyTripPrice(tripId: string, kind: PriceKind) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  const trip = await ownedTrip(tripId, userId);
  if (!trip) return { error: "Not your trip." };
  if (trip.isLocked) return { error: "Unlock the whole trip first." };

  await prisma.trip.update({
    where: { id: tripId },
    data: { [PRICE_FIELDS[kind].locked]: false },
  });
  revalidatePath(`/dashboard/my-trips/${tripId}`);
  return { success: true };
}

/** Reopen a locked trip for price edits (clears the per-line locks too). */
export async function unlockMyTrip(tripId: string) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  if (!(await ownedTrip(tripId, userId))) return { error: "Not your trip." };

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
  revalidatePath(`/dashboard/my-trips/${tripId}`);
  revalidatePath("/dashboard/payment");
  return { success: true };
}

// ---------- contributions (owner-scoped) ----------

/** Post an item for participants to bring on a trip you own. */
export async function addTripContribution(
  tripId: string,
  title: string,
  description?: string,
  category?: string,
) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  if (!(await ownedTrip(tripId, userId))) return { error: "Not your trip." };

  const trimmed = title.trim();
  if (!trimmed) return { error: "Give the item a title." };

  await prisma.contribution.create({
    data: {
      tripId,
      title: trimmed,
      description: description?.trim() || undefined,
      category: category?.trim() || undefined,
    },
  });
  revalidatePath(`/dashboard/my-trips/${tripId}`);
  revalidatePath("/dashboard/contributions");
  return { success: true };
}

export async function deleteTripContribution(contributionId: string) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  const item = await prisma.contribution.findUnique({
    where: { id: contributionId },
    select: { tripId: true },
  });
  if (!item || !(await ownedTrip(item.tripId, userId))) return { error: "Not your trip." };

  await prisma.userContribution.deleteMany({ where: { contributionId } });
  await prisma.contribution.delete({ where: { id: contributionId } });
  revalidatePath(`/dashboard/my-trips/${item.tripId}`);
  revalidatePath("/dashboard/contributions");
  return { success: true };
}

// ---------- expenses (owner-scoped) ----------

async function recomputeTripExpenses(tripId: string) {
  const total = await prisma.expense.aggregate({
    where: { tripId, approved: true },
    _sum: { amount: true },
  });
  await prisma.trip.update({
    where: { id: tripId },
    data: { totalExpenses: total._sum.amount ?? 0 },
  });
}

export async function approveTripExpense(expenseId: string) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { tripId: true },
  });
  if (!expense || !(await ownedTrip(expense.tripId, userId))) return { error: "Not your trip." };

  await prisma.expense.update({ where: { id: expenseId }, data: { approved: true } });
  await recomputeTripExpenses(expense.tripId);
  revalidatePath(`/dashboard/my-trips/${expense.tripId}`);
  revalidatePath("/dashboard/expenses");
  return { success: true };
}

export async function deleteTripExpense(expenseId: string) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense || !(await ownedTrip(expense.tripId, userId))) return { error: "Not your trip." };

  if (expense.receiptUrl) {
    try {
      await deleteBlob(expense.receiptUrl);
    } catch (err) {
      console.error("Failed to delete receipt blob:", err);
    }
  }
  await prisma.expense.delete({ where: { id: expenseId } });
  await recomputeTripExpenses(expense.tripId);
  revalidatePath(`/dashboard/my-trips/${expense.tripId}`);
  revalidatePath("/dashboard/expenses");
  return { success: true };
}

// ---------- beds / sleeping layout (owner-scoped) ----------

const DEFAULT_HOUSE: { room: string; label: string; type: "SINGLE" | "DOUBLE" }[] = [
  { room: "Bedroom 1", label: "Queen Bed", type: "DOUBLE" },
  { room: "Bedroom 2", label: "Queen Bed", type: "DOUBLE" },
  { room: "Bedroom 3", label: "King Bed", type: "DOUBLE" },
  { room: "Bedroom 3", label: "Twin Bed", type: "SINGLE" },
  { room: "Bedroom 4", label: "Twin Bed 1", type: "SINGLE" },
  { room: "Bedroom 4", label: "Twin Bed 2", type: "SINGLE" },
  { room: "Bedroom 5", label: "Queen Bed", type: "DOUBLE" },
];

/** Seed a starter bedroom layout on a trip you own (only if it has no beds). */
export async function seedDefaultTripBeds(tripId: string) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  if (!(await ownedTrip(tripId, userId))) return { error: "Not your trip." };

  const existing = await prisma.bed.count({ where: { tripId } });
  if (existing > 0) return { error: "This trip already has beds." };

  await prisma.bed.createMany({
    data: DEFAULT_HOUSE.map((b) => ({ tripId, room: b.room, label: b.label, type: b.type })),
  });
  revalidatePath(`/dashboard/my-trips/${tripId}`);
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

/** Add one or more beds to a trip you own. */
export async function addTripBed(
  tripId: string,
  data: { label: string; room?: string; type: "SINGLE" | "DOUBLE"; womenOnly: boolean; count: number },
) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  if (!(await ownedTrip(tripId, userId))) return { error: "Not your trip." };

  const label = data.label.trim();
  if (!label) return { error: "Give the bed a label." };
  const room = data.room?.trim() || null;
  const count = Math.min(20, Math.max(1, Math.floor(data.count) || 1));

  if (count === 1) {
    await prisma.bed.create({ data: { tripId, label, room, type: data.type, womenOnly: data.womenOnly } });
  } else {
    await prisma.bed.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        tripId,
        label: `${label} ${i + 1}`,
        room,
        type: data.type,
        womenOnly: data.womenOnly,
      })),
    });
  }
  revalidatePath(`/dashboard/my-trips/${tripId}`);
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

export async function deleteTripBed(bedId: string) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  const bed = await prisma.bed.findUnique({ where: { id: bedId }, select: { tripId: true } });
  if (!bed || !(await ownedTrip(bed.tripId, userId))) return { error: "Not your trip." };

  await prisma.bedAssignment.deleteMany({ where: { bedId } });
  await prisma.bed.delete({ where: { id: bedId } });
  revalidatePath(`/dashboard/my-trips/${bed.tripId}`);
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}
