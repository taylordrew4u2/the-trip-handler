"use server";

import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { deleteBlob } from "@/lib/blob";
import { sendApprovalEmail, sendRejectionEmail, sendTripLockedEmail } from "@/lib/resend";
import { hasFeature, hasMeals, memberShare, tripCostTotal } from "@/lib/pricing";
import { isSectionKey } from "@/lib/nav";
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

// Human-friendly code alphabet: no 0/O/1/I/L to avoid read-aloud ambiguity.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomJoinCode(length = 6): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

/** Generate a unique join code, retrying on the (rare) collision. */
async function uniqueJoinCode(length = 6): Promise<string | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomJoinCode(length);
    const taken = await prisma.trip.findUnique({ where: { joinCode: code } });
    if (!taken) return code;
  }
  return null;
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

/**
 * Issue (or rotate) the short join code for a trip you own. Members can enter
 * this code on the home screen to find the trip and apply. Returns the code.
 */
export async function generateMyTripJoinCode(tripId: string) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  if (!(await ownedTrip(tripId, userId))) return { error: "Not your trip." };

  for (let attempt = 0; attempt < 12; attempt++) {
    const joinCode = (await uniqueJoinCode(6)) ?? (await uniqueJoinCode(8));
    if (!joinCode) continue;
    try {
      await prisma.trip.update({ where: { id: tripId }, data: { joinCode } });
      revalidatePath("/dashboard/my-trips");
      return { success: true, joinCode };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }

  return { error: "Couldn't generate a unique trip code. Try again." };
}

/** Remove a trip's join code so it can no longer be found by search. */
export async function clearMyTripJoinCode(tripId: string) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  if (!(await ownedTrip(tripId, userId))) return { error: "Not your trip." };

  await prisma.trip.update({ where: { id: tripId }, data: { joinCode: null } });
  revalidatePath("/dashboard/my-trips");
  return { success: true };
}

/**
 * Resolve a join code typed on the home screen to the trip's invite link, so
 * the member lands on the normal apply flow. Doesn't apply them — that still
 * goes through the trip page so the owner approves, same as an invite link.
 */
export async function findTripByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { error: "Enter a trip code." };

  const trip = await prisma.trip.findUnique({ where: { joinCode: normalized } });
  if (!trip) return { error: "No trip matches that code." };
  if (!trip.isApplicationOpen) {
    return { error: "That trip isn't accepting applications right now." };
  }

  // Every trip created in-app has an invite token; backfill the rare legacy
  // trip that doesn't so the apply page has a stable URL to land on.
  let token = trip.inviteToken;
  if (!token) {
    token = randomBytes(12).toString("hex");
    await prisma.trip.update({ where: { id: trip.id }, data: { inviteToken: token } });
  }
  return { success: true, token };
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
    data: { status: "CANCELLED", rejectedTripId: applicant.tripId },
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

  // A user's bed, payments, contributions, and votes are scoped to their
  // single tripId. Don't silently move someone off a trip they're still on —
  // only let them apply when they have no trip or have left/been removed.
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { tripId: true, status: true, rejectedTripId: true },
  });
  // A rejected applicant can't silently re-apply (withdrawals can, since they
  // set CANCELLED without a rejectedTripId).
  if (me?.rejectedTripId === trip.id) {
    return { error: "Your application to this trip was declined." };
  }
  if (me?.tripId === trip.id && me.status !== "CANCELLED") {
    return { error: "You've already applied to this trip." };
  }
  if (me?.tripId && me.tripId !== trip.id && me.status !== "CANCELLED") {
    return {
      error: "You're already on another trip. Withdraw from it before applying to a new one.",
    };
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

/** Set how many ways costs are split on a trip you own. */
export async function updateMyTripCostShareDivisor(tripId: string, divisor: number) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  const trip = await ownedTrip(tripId, userId);
  if (!trip) return { error: "Not your trip." };
  if (trip.isLocked) return { error: "Unlock the trip before changing the split." };
  if (!Number.isInteger(divisor) || divisor < 1 || divisor > 2147483647) {
    return { error: "Split count must be a positive whole number." };
  }

  const updated = await prisma.trip.updateMany({
    where: { id: tripId, ownerId: userId, isLocked: false },
    data: { costShareDivisor: divisor },
  });
  if (updated.count === 0) return { error: "Trip changed. Refresh and try again." };
  revalidatePath(`/dashboard/my-trips/${tripId}`);
  revalidatePath("/dashboard/payment");
  revalidatePath("/dashboard");
  return { success: true };
}

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
 * Once every required cost line is locked, solidify the trip: compute the
 * per-person share, lock it, move this trip's approved participants to
 * PENDING_PAYMENT, and email each their own amount. Meals / transport lines
 * aren't required (or counted) when the trip doesn't have them.
 */
async function finalizeTripIfReady(tripId: string) {
  const updated = await prisma.trip.findUnique({ where: { id: tripId } });
  if (
    updated &&
    updated.housingLocked &&
    (updated.transportLocked || !hasFeature(updated, "transport")) &&
    (updated.mealsLocked || !hasMeals(updated)) &&
    !updated.isLocked
  ) {
    const total = tripCostTotal(updated);
    // Round to whole cents so the stored amount-owed is exact.
    const share = Math.round((total / updated.costShareDivisor) * 100) / 100;

    // Atomically claim finalization: only the call that actually flips
    // isLocked from false proceeds to move members and send emails, so two
    // concurrent/double-fired locks can't double-bill or double-email.
    const claim = await prisma.trip.updateMany({
      where: { id: tripId, isLocked: false, costShareDivisor: updated.costShareDivisor },
      data: { finalPrice: share, isLocked: true, lockedAt: new Date() },
    });
    if (claim.count > 0) {
      // Scope status changes and emails to THIS trip's participants only.
      await prisma.user.updateMany({
        where: { tripId, status: "APPROVED" },
        data: { status: "PENDING_PAYMENT" },
      });
      const participants = await prisma.user.findMany({
        where: { tripId, status: { in: ["PENDING_PAYMENT", "APPROVED"] } },
        include: { bedAssignment: { include: { bed: { select: { priceAdjustment: true } } } } },
      });
      for (const p of participants) {
        // Each email carries only that member's own amount.
        const owed = memberShare(share, p.bedAssignment?.bed.priceAdjustment ?? 0, p.priceAdjustment);
        try {
          await sendTripLockedEmail(p.email, p.name, owed, updated.depositAmount);
        } catch (e) {
          console.error("Email failed:", e);
        }
      }
    }
  }
}

/**
 * Lock one cost line. When every required line is locked the trip
 * auto-solidifies (see finalizeTripIfReady).
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

  await finalizeTripIfReady(tripId);

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

  // Once anyone has paid, the price is settled — reopening it would leave
  // paid members on a stale amount with no clean way to re-bill them.
  const paid = await prisma.user.count({ where: { tripId, status: "CONFIRMED_PAID" } });
  if (paid > 0) {
    return { error: "Can't change prices — members have already paid." };
  }

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

// ---------- sections (owner-scoped) ----------

/** Turn member dashboard sections on or off. Pass the keys to turn off. */
export async function updateTripSections(tripId: string, disabled: string[]) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  if (!(await ownedTrip(tripId, userId))) return { error: "Not your trip." };

  const clean = Array.from(new Set(disabled.filter(isSectionKey)));
  await prisma.trip.update({ where: { id: tripId }, data: { disabledSections: clean } });
  // Turning meals or transport off can leave every remaining cost line locked.
  if (clean.includes("meals") || clean.includes("transport")) await finalizeTripIfReady(tripId);
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/dashboard/my-trips/${tripId}`);
  return { success: true };
}

// ---------- private pricing (owner-scoped) ----------

export type PriceVisibility = {
  showLineItems: boolean;
  showBedPrices: boolean;
  showPersonalAdjustment: boolean;
};

/** Choose what members see in their own price breakdown. */
export async function updateTripPriceVisibility(tripId: string, visibility: PriceVisibility) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  if (!(await ownedTrip(tripId, userId))) return { error: "Not your trip." };

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      showLineItems: Boolean(visibility.showLineItems),
      showBedPrices: Boolean(visibility.showBedPrices),
      showPersonalAdjustment: Boolean(visibility.showPersonalAdjustment),
    },
  });
  revalidatePath(`/dashboard/my-trips/${tripId}`);
  revalidatePath("/dashboard/payment");
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

function cleanHandle(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().replace(/^[@$]+/, "").slice(0, 60);
  return v || null;
}

/** Set the deposit amount and which off-Stripe methods (Venmo, Cash App) you accept. */
export async function updateTripPaymentSettings(
  tripId: string,
  settings: { depositAmount: number; venmoHandle?: string | null; cashAppHandle?: string | null },
) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  const trip = await ownedTrip(tripId, userId);
  if (!trip) return { error: "Not your trip." };

  const deposit = Math.round(settings.depositAmount * 100) / 100;
  if (!Number.isFinite(deposit) || deposit < 0) return { error: "Deposit must be a non-negative number." };
  if (deposit !== trip.depositAmount) {
    // Same rule as reopening prices: a paid member's bill is settled.
    const paid = await prisma.user.count({ where: { tripId, status: "CONFIRMED_PAID" } });
    if (paid > 0) return { error: "Can't change the deposit — members have already paid." };
  }

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      depositAmount: deposit,
      venmoHandle: cleanHandle(settings.venmoHandle),
      cashAppHandle: cleanHandle(settings.cashAppHandle),
    },
  });
  revalidatePath(`/dashboard/my-trips/${tripId}`);
  revalidatePath("/dashboard/payment");
  return { success: true };
}

/**
 * Give one member of your trip a private price change (negative = they pay
 * less). Only the owner ever reads it back; the member sees their own total.
 */
export async function updateMemberPriceAdjustment(
  memberId: string,
  amount: number,
  note?: string,
) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { tripId: true, status: true },
  });
  if (!member?.tripId || !(await ownedTrip(member.tripId, userId))) return { error: "Not your trip." };
  if (member.status === "CONFIRMED_PAID") return { error: "They've already paid." };
  if (!Number.isFinite(amount)) return { error: "Amount must be a number." };

  await prisma.user.update({
    where: { id: memberId },
    data: {
      priceAdjustment: Math.round(amount * 100) / 100,
      priceAdjustmentNote: note?.trim() || null,
    },
  });
  revalidatePath(`/dashboard/my-trips/${member.tripId}`);
  revalidatePath("/dashboard/payment");
  return { success: true };
}

/** Make a bed cost more (or less) than the base share. Visible to the trip. */
export async function updateTripBedPrice(bedId: string, amount: number) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  const bed = await prisma.bed.findUnique({ where: { id: bedId }, select: { tripId: true } });
  if (!bed || !(await ownedTrip(bed.tripId, userId))) return { error: "Not your trip." };
  if (!Number.isFinite(amount)) return { error: "Amount must be a number." };

  await prisma.bed.update({
    where: { id: bedId },
    data: { priceAdjustment: Math.round(amount * 100) / 100 },
  });
  revalidatePath(`/dashboard/my-trips/${bed.tripId}`);
  revalidatePath("/dashboard/sleeping");
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

// Recompute the trip's approved-expense total inside the caller's
// transaction, so the expense mutation and the total update commit together
// and concurrent approvals/deletes can't lose updates.
async function recomputeTripExpenses(tx: Prisma.TransactionClient, tripId: string) {
  const total = await tx.expense.aggregate({
    where: { tripId, approved: true },
    _sum: { amount: true },
  });
  await tx.trip.update({
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

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({ where: { id: expenseId }, data: { approved: true } });
    await recomputeTripExpenses(tx, expense.tripId);
  });
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
  await prisma.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id: expenseId } });
    await recomputeTripExpenses(tx, expense.tripId);
  });
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
  data: {
    label: string;
    room?: string;
    type: "SINGLE" | "DOUBLE";
    womenOnly: boolean;
    count: number;
    priceAdjustment?: number;
  },
) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in first." };
  if (!(await ownedTrip(tripId, userId))) return { error: "Not your trip." };

  const label = data.label.trim();
  if (!label) return { error: "Give the bed a label." };
  const room = data.room?.trim() || null;
  const count = Math.min(20, Math.max(1, Math.floor(data.count) || 1));
  const priceAdjustment = Number.isFinite(data.priceAdjustment)
    ? Math.round((data.priceAdjustment as number) * 100) / 100
    : 0;

  if (count === 1) {
    await prisma.bed.create({
      data: { tripId, label, room, type: data.type, womenOnly: data.womenOnly, priceAdjustment },
    });
  } else {
    await prisma.bed.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        tripId,
        label: `${label} ${i + 1}`,
        room,
        type: data.type,
        womenOnly: data.womenOnly,
        priceAdjustment,
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
