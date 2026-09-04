"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { SLOT_DEFS, type Phase } from "@/lib/meals";

const APPROVED = new Set(["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"]);

async function sessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id && id !== "admin" ? id : null;
}

/** True when the signed-in user owns the given trip. */
async function ownsTrip(tripId: string, userId: string): Promise<boolean> {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ownerId: userId },
    select: { id: true },
  });
  return Boolean(trip);
}

async function tripIdOfSlot(slotId: string): Promise<string | null> {
  const slot = await prisma.mealSlot.findUnique({ where: { id: slotId }, select: { tripId: true } });
  return slot?.tripId ?? null;
}

async function suggestionBelongsToSlot(suggestionId: string, mealSlotId: string): Promise<boolean> {
  const s = await prisma.mealSuggestion.findUnique({
    where: { id: suggestionId },
    select: { mealSlotId: true },
  });
  return s?.mealSlotId === mealSlotId;
}

/** Authorize a meal-management action on a trip the caller must own. */
async function requireMealManager(
  tripId: string | null,
): Promise<{ tripId: string } | { error: string }> {
  const userId = await sessionUserId();
  if (!userId) return { error: "Sign in first." };
  if (!tripId || !(await ownsTrip(tripId, userId))) return { error: "Not your trip." };
  return { tripId };
}

/**
 * Authorize a participant action on a specific trip: the caller must be an
 * approved member of that trip.
 */
async function requireApprovedMember(tripId: string): Promise<{ id: string } | { error: string }> {
  const userId = await sessionUserId();
  if (!userId) return { error: "Sign in as a participant first." };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, tripId: true, role: true },
  });
  if (!user || user.role === "ADMIN") return { error: "Sign in as a participant first." };
  if (user.tripId !== tripId) return { error: "That meal isn't on your trip." };
  if (!APPROVED.has(user.status ?? "")) return { error: "You need to be approved first." };
  return { id: userId };
}

/**
 * Seed the default meal slots and phase row for a trip on first view.
 * Only seeds when the trip has zero slots — owner edits/deletes are preserved.
 */
export async function ensureMealPlanSetup(tripId: string) {
  if (!tripId) return;

  // This is invoked while rendering the meals pages, but it is exported from a
  // "use server" module, which makes it a callable endpoint like any other
  // action. Without this check any caller could seed slots into a trip id of
  // their choosing, so the caller must actually belong to the trip: its owner
  // (the owner-side page) or an approved member (the participant page).
  const userId = await sessionUserId();
  if (!userId) return;
  if (!(await ownsTrip(tripId, userId))) {
    const member = await requireApprovedMember(tripId);
    if ("error" in member) return;
  }

  const slotCount = await prisma.mealSlot.count({ where: { tripId } });
  if (slotCount === 0) {
    await prisma.mealSlot.createMany({
      data: SLOT_DEFS.map((def) => ({
        tripId,
        dayName: def.day,
        mealType: def.meal,
        orderIndex: def.order,
        isOptional: def.optional,
      })),
    });
  }

  await prisma.mealPlanPhase.upsert({
    where: { tripId },
    create: { tripId, currentPhase: "suggestions_open", suggestionsOpenedAt: new Date() },
    update: {},
  });
}

// ---------- Slot management (trip owner) ----------

export async function addMealSlot(tripId: string, formData: FormData) {
  const auth = await requireMealManager(tripId);
  if ("error" in auth) return auth;

  const dayName = ((formData.get("dayName") as string) ?? "").trim();
  const mealType = ((formData.get("mealType") as string) ?? "").trim();
  const isOptional = Boolean(formData.get("isOptional"));
  if (!dayName || !mealType) return { error: "Day and meal type are required." };

  const existing = await prisma.mealSlot.findUnique({
    where: { tripId_dayName_mealType: { tripId, dayName, mealType } },
  });
  if (existing) return { error: `${dayName} ${mealType} already exists.` };

  const max = await prisma.mealSlot.aggregate({ where: { tripId }, _max: { orderIndex: true } });
  const orderIndex = (max._max.orderIndex ?? -1) + 1;

  await prisma.mealSlot.create({ data: { tripId, dayName, mealType, orderIndex, isOptional } });
  revalidatePath("/dashboard/meals");
  revalidatePath(`/dashboard/my-trips/${tripId}/meals`);
  return { success: true };
}

export async function editMealSlot(slotId: string, formData: FormData) {
  const auth = await requireMealManager(await tripIdOfSlot(slotId));
  if ("error" in auth) return auth;

  const dayName = ((formData.get("dayName") as string) ?? "").trim();
  const mealType = ((formData.get("mealType") as string) ?? "").trim();
  const isOptional = Boolean(formData.get("isOptional"));
  if (!dayName || !mealType) return { error: "Day and meal type are required." };

  const conflict = await prisma.mealSlot.findUnique({
    where: { tripId_dayName_mealType: { tripId: auth.tripId, dayName, mealType } },
  });
  if (conflict && conflict.id !== slotId) return { error: `${dayName} ${mealType} already exists.` };

  await prisma.mealSlot.update({ where: { id: slotId }, data: { dayName, mealType, isOptional } });
  revalidatePath("/dashboard/meals");
  revalidatePath(`/dashboard/my-trips/${auth.tripId}/meals`);
  return { success: true };
}

export async function deleteMealSlot(slotId: string) {
  const auth = await requireMealManager(await tripIdOfSlot(slotId));
  if ("error" in auth) return auth;
  // Cascades: suggestions, votes, helpers, groceries are all onDelete: Cascade.
  await prisma.mealSlot.delete({ where: { id: slotId } });
  revalidatePath("/dashboard/meals");
  revalidatePath(`/dashboard/my-trips/${auth.tripId}/meals`);
  return { success: true };
}

// ---------- Phase transitions (trip owner) ----------

export async function setPhase(tripId: string, next: Phase, opts?: { force?: boolean }) {
  const auth = await requireMealManager(tripId);
  if ("error" in auth) return auth;

  const data: Record<string, Date | string> = { currentPhase: next };
  const now = new Date();
  if (next === "suggestions_open") data.suggestionsOpenedAt = now;
  if (next === "voting_open") data.votingOpenedAt = now;
  if (next === "admin_finalizing") data.votingClosedAt = now;
  if (next === "finalized") data.finalizedAt = now;

  if (next === "finalized" && !opts?.force) {
    const incomplete = await votingCompletionSummary(tripId);
    if (incomplete && incomplete.usersIncomplete > 0) {
      return {
        error: `${incomplete.usersIncomplete} user(s) haven't finished voting. Use "Finalize anyway" to override.`,
      };
    }
  }

  await prisma.mealPlanPhase.upsert({
    where: { tripId },
    create: { tripId, currentPhase: next, ...data },
    update: data,
  });

  revalidatePath("/dashboard/meals");
  revalidatePath(`/dashboard/my-trips/${tripId}/meals`);
  return { success: true };
}

// ---------- Suggestions (participant) ----------

export async function createSuggestion(formData: FormData) {
  const mealSlotId = formData.get("mealSlotId") as string;
  if (!mealSlotId) return { error: "Pick a slot." };
  const tripId = await tripIdOfSlot(mealSlotId);
  if (!tripId) return { error: "Meal slot not found." };

  const auth = await requireApprovedMember(tripId);
  if ("error" in auth) return auth;

  const phase = await prisma.mealPlanPhase.findUnique({ where: { tripId } });
  if (!["suggestions_open", "voting_open"].includes(phase?.currentPhase ?? "")) {
    return { error: "Suggestions are closed." };
  }

  const mealName = ((formData.get("mealName") as string) ?? "").trim();
  const note = ((formData.get("note") as string) ?? "").trim() || null;
  const helpOffered = formData.getAll("helpOffered").map((v) => v.toString());
  const dietaryTags = formData.getAll("dietaryTags").map((v) => v.toString());
  if (!mealName) return { error: "Enter a meal name." };

  await prisma.mealSuggestion.create({
    data: { mealSlotId, mealName, submittedByUserId: auth.id, note, helpOffered, dietaryTags },
  });

  revalidatePath("/dashboard/meals");
  return { success: true };
}

export async function deleteSuggestion(suggestionId: string) {
  const userId = await sessionUserId();
  if (!userId) return { error: "Sign in first." };

  const s = await prisma.mealSuggestion.findUnique({
    where: { id: suggestionId },
    include: { mealSlot: { select: { tripId: true } } },
  });
  if (!s) return { success: true };

  const isSubmitter = s.submittedByUserId === userId;
  const isOwner = await ownsTrip(s.mealSlot.tripId, userId);
  if (!isSubmitter && !isOwner) return { error: "Not yours." };

  await prisma.mealSuggestion.delete({ where: { id: suggestionId } });
  revalidatePath("/dashboard/meals");
  revalidatePath(`/dashboard/my-trips/${s.mealSlot.tripId}/meals`);
  return { success: true };
}

// ---------- Voting (participant) ----------

export async function castVote(mealSlotId: string, suggestionId: string | null, isDontCare: boolean) {
  const tripId = await tripIdOfSlot(mealSlotId);
  if (!tripId) return { error: "Meal slot not found." };

  const auth = await requireApprovedMember(tripId);
  if ("error" in auth) return auth;

  const phase = await prisma.mealPlanPhase.findUnique({ where: { tripId } });
  if (!["suggestions_open", "voting_open"].includes(phase?.currentPhase ?? "")) {
    return { error: "Voting is closed." };
  }

  if (isDontCare && suggestionId) return { error: "Pick one or the other." };
  if (!isDontCare && !suggestionId) return { error: "Pick a meal or 'I don't care'." };

  // The suggestion being voted for must belong to this slot (not another
  // slot's or another trip's suggestion).
  if (!isDontCare && suggestionId && !(await suggestionBelongsToSlot(suggestionId, mealSlotId))) {
    return { error: "That suggestion isn't on this meal." };
  }

  await prisma.mealVote.upsert({
    where: { userId_mealSlotId: { userId: auth.id, mealSlotId } },
    create: { userId: auth.id, mealSlotId, suggestionId: isDontCare ? null : suggestionId, isDontCare },
    update: { suggestionId: isDontCare ? null : suggestionId, isDontCare },
  });

  revalidatePath("/dashboard/meals");
  return { success: true };
}

// ---------- Finalize / slot status (trip owner) ----------

export async function confirmMeal(mealSlotId: string, suggestionId: string | null, overrideNote?: string) {
  const auth = await requireMealManager(await tripIdOfSlot(mealSlotId));
  if ("error" in auth) return auth;

  if (suggestionId && !(await suggestionBelongsToSlot(suggestionId, mealSlotId))) {
    return { error: "That suggestion isn't on this meal." };
  }

  await prisma.mealSlot.update({
    where: { id: mealSlotId },
    data: {
      confirmedSuggestionId: suggestionId,
      adminOverrideNote: overrideNote?.trim() || null,
      status: suggestionId ? "CONFIRMED" : "PENDING",
    },
  });

  revalidatePath("/dashboard/meals");
  revalidatePath(`/dashboard/my-trips/${auth.tripId}/meals`);
  return { success: true };
}

export async function setSlotStatus(
  mealSlotId: string,
  status: "PENDING" | "CONFIRMED" | "GROCERIES_BOUGHT" | "HANDLED",
) {
  const auth = await requireMealManager(await tripIdOfSlot(mealSlotId));
  if ("error" in auth) return auth;
  await prisma.mealSlot.update({ where: { id: mealSlotId }, data: { status } });
  revalidatePath("/dashboard/meals");
  revalidatePath(`/dashboard/my-trips/${auth.tripId}/meals`);
  return { success: true };
}

// ---------- Helpers (cook/prep/shop/clean) ----------

export async function addHelper(mealSlotId: string, userId: string, helpType: string) {
  const auth = await requireMealManager(await tripIdOfSlot(mealSlotId));
  if ("error" in auth) return auth;
  // The helper must be a member of this trip — don't let an arbitrary or
  // cross-trip user id be attached to the meal slot.
  const member = await prisma.user.findFirst({
    where: { id: userId, tripId: auth.tripId },
    select: { id: true },
  });
  if (!member) return { error: "That person isn't on this trip." };
  await prisma.mealHelper.create({ data: { mealSlotId, userId, helpType } });
  revalidatePath("/dashboard/meals");
  revalidatePath(`/dashboard/my-trips/${auth.tripId}/meals`);
  return { success: true };
}

export async function removeHelper(helperId: string) {
  const helper = await prisma.mealHelper.findUnique({
    where: { id: helperId },
    include: { mealSlot: { select: { tripId: true } } },
  });
  if (!helper) return { success: true };
  const auth = await requireMealManager(helper.mealSlot.tripId);
  if ("error" in auth) return auth;
  await prisma.mealHelper.delete({ where: { id: helperId } });
  revalidatePath("/dashboard/meals");
  revalidatePath(`/dashboard/my-trips/${helper.mealSlot.tripId}/meals`);
  return { success: true };
}

// ---------- Groceries (trip owner) ----------

export async function addGroceryItem(formData: FormData) {
  const mealSlotId = formData.get("mealSlotId") as string;
  if (!mealSlotId) return { error: "Missing slot." };
  const auth = await requireMealManager(await tripIdOfSlot(mealSlotId));
  if ("error" in auth) return auth;

  const name = ((formData.get("name") as string) ?? "").trim();
  const category = ((formData.get("category") as string) ?? "Other").trim();
  const quantity = ((formData.get("quantity") as string) ?? "").trim() || null;
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;
  if (!name) return { error: "Enter an item name." };

  await prisma.groceryItem.create({ data: { mealSlotId, name, category, quantity, notes } });
  revalidatePath("/dashboard/meals");
  revalidatePath(`/dashboard/my-trips/${auth.tripId}/meals`);
  return { success: true };
}

async function tripIdOfGrocery(itemId: string): Promise<string | null> {
  const item = await prisma.groceryItem.findUnique({
    where: { id: itemId },
    include: { mealSlot: { select: { tripId: true } } },
  });
  return item?.mealSlot.tripId ?? null;
}

export async function toggleBought(itemId: string, bought: boolean) {
  const auth = await requireMealManager(await tripIdOfGrocery(itemId));
  if ("error" in auth) return auth;
  await prisma.groceryItem.update({ where: { id: itemId }, data: { bought } });
  revalidatePath("/dashboard/meals");
  revalidatePath(`/dashboard/my-trips/${auth.tripId}/meals`);
  return { success: true };
}

export async function deleteGroceryItem(itemId: string) {
  const auth = await requireMealManager(await tripIdOfGrocery(itemId));
  if ("error" in auth) return auth;
  await prisma.groceryItem.delete({ where: { id: itemId } });
  revalidatePath("/dashboard/meals");
  revalidatePath(`/dashboard/my-trips/${auth.tripId}/meals`);
  return { success: true };
}

// ---------- Voting completion summary (owner panel + user tracker) ----------

async function votingCompletionSummary(tripId: string) {
  if (!tripId) return null;

  const requiredSlots = await prisma.mealSlot.findMany({
    where: { tripId, isOptional: false },
    select: { id: true },
  });
  const requiredCount = requiredSlots.length;

  const approvedUsers = await prisma.user.findMany({
    where: {
      tripId,
      role: "PARTICIPANT",
      status: { in: ["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"] },
    },
    select: { id: true, name: true },
  });

  const votes = await prisma.mealVote.findMany({
    where: { mealSlotId: { in: requiredSlots.map((s) => s.id) } },
    select: { userId: true, mealSlotId: true },
  });

  const byUser = new Map<string, Set<string>>();
  for (const v of votes) {
    if (!byUser.has(v.userId)) byUser.set(v.userId, new Set());
    byUser.get(v.userId)!.add(v.mealSlotId);
  }

  const incompleteUsers = approvedUsers.filter((u) => (byUser.get(u.id)?.size ?? 0) < requiredCount);
  return {
    requiredCount,
    totalUsers: approvedUsers.length,
    usersComplete: approvedUsers.length - incompleteUsers.length,
    usersIncomplete: incompleteUsers.length,
    incompleteUsers,
  };
}

export { votingCompletionSummary };
