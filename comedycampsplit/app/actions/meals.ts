"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { SLOT_DEFS, type Phase } from "@/lib/meals";

const APPROVED = new Set(["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"]);

async function getCurrentTripId(): Promise<string | null> {
  const trip = await prisma.trip.findFirst({ select: { id: true } });
  return trip?.id ?? null;
}

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return (session?.user as { role?: string } | undefined)?.role === "ADMIN";
}

async function requireApprovedUser(): Promise<{ id: string } | { error: string }> {
  const session = await getServerSession(authOptions);
  const u = session?.user as { id?: string; status?: string; role?: string } | undefined;
  if (!u?.id || u.id === "admin" || u.role === "ADMIN") return { error: "Sign in as a participant first." };
  if (!APPROVED.has(u.status ?? "")) return { error: "You need to be approved first." };
  return { id: u.id };
}

/**
 * Make sure all 9 meal slots and the phase row exist for the current trip.
 * Idempotent — safe to call on every page load.
 */
export async function ensureMealPlanSetup() {
  const tripId = await getCurrentTripId();
  if (!tripId) return;

  for (const def of SLOT_DEFS) {
    await prisma.mealSlot.upsert({
      where: { tripId_dayName_mealType: { tripId, dayName: def.day, mealType: def.meal } },
      create: {
        tripId,
        dayName: def.day,
        mealType: def.meal,
        orderIndex: def.order,
        isOptional: def.optional,
      },
      update: { orderIndex: def.order, isOptional: def.optional },
    });
  }

  await prisma.mealPlanPhase.upsert({
    where: { tripId },
    create: {
      tripId,
      currentPhase: "suggestions_open",
      suggestionsOpenedAt: new Date(),
    },
    update: {},
  });
}

// ---------- Phase transitions (admin only) ----------

export async function setPhase(next: Phase, opts?: { force?: boolean }) {
  if (!(await isAdmin())) return { error: "Admin only." };
  const tripId = await getCurrentTripId();
  if (!tripId) return { error: "No trip yet." };

  const data: Record<string, Date | string> = { currentPhase: next };
  const now = new Date();
  if (next === "suggestions_open") data.suggestionsOpenedAt = now;
  if (next === "voting_open") data.votingOpenedAt = now;
  if (next === "admin_finalizing") data.votingClosedAt = now;
  if (next === "finalized") data.finalizedAt = now;

  // Optional safety: guard finalize behind the "force" flag if not all required votes done.
  if (next === "finalized" && !opts?.force) {
    const incomplete = await votingCompletionSummary();
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
  revalidatePath("/admin/meal-plan");
  return { success: true };
}

// ---------- Suggestions ----------

export async function createSuggestion(formData: FormData) {
  const auth = await requireApprovedUser();
  if ("error" in auth) return auth;

  const tripId = await getCurrentTripId();
  if (!tripId) return { error: "No trip yet." };
  const phase = await prisma.mealPlanPhase.findUnique({ where: { tripId } });
  if (phase?.currentPhase !== "suggestions_open") return { error: "Suggestions are closed." };

  const mealSlotId = formData.get("mealSlotId") as string;
  const mealName = ((formData.get("mealName") as string) ?? "").trim();
  const note = ((formData.get("note") as string) ?? "").trim() || null;
  const helpOffered = formData.getAll("helpOffered").map((v) => v.toString());
  const dietaryTags = formData.getAll("dietaryTags").map((v) => v.toString());

  if (!mealSlotId || !mealName) return { error: "Pick a slot and a meal name." };

  await prisma.mealSuggestion.create({
    data: { mealSlotId, mealName, submittedByUserId: auth.id, note, helpOffered, dietaryTags },
  });

  revalidatePath("/dashboard/meals");
  revalidatePath("/admin/meal-plan");
  return { success: true };
}

export async function deleteSuggestion(suggestionId: string) {
  const session = await getServerSession(authOptions);
  const u = session?.user as { id?: string; role?: string } | undefined;
  if (!u?.id) return { error: "Sign in first." };

  const s = await prisma.mealSuggestion.findUnique({ where: { id: suggestionId } });
  if (!s) return { success: true };
  if (s.submittedByUserId !== u.id && u.role !== "ADMIN") return { error: "Not yours." };

  await prisma.mealSuggestion.delete({ where: { id: suggestionId } });
  revalidatePath("/dashboard/meals");
  revalidatePath("/admin/meal-plan");
  return { success: true };
}

// ---------- Voting ----------

export async function castVote(mealSlotId: string, suggestionId: string | null, isDontCare: boolean) {
  const auth = await requireApprovedUser();
  if ("error" in auth) return auth;

  const tripId = await getCurrentTripId();
  if (!tripId) return { error: "No trip yet." };
  const phase = await prisma.mealPlanPhase.findUnique({ where: { tripId } });
  if (phase?.currentPhase !== "voting_open") return { error: "Voting is closed." };

  if (isDontCare && suggestionId) return { error: "Pick one or the other." };
  if (!isDontCare && !suggestionId) return { error: "Pick a meal or 'I don't care'." };

  await prisma.mealVote.upsert({
    where: { userId_mealSlotId: { userId: auth.id, mealSlotId } },
    create: {
      userId: auth.id,
      mealSlotId,
      suggestionId: isDontCare ? null : suggestionId,
      isDontCare,
    },
    update: {
      suggestionId: isDontCare ? null : suggestionId,
      isDontCare,
    },
  });

  revalidatePath("/dashboard/meals");
  revalidatePath("/admin/meal-plan");
  return { success: true };
}

// ---------- Admin: finalize ----------

export async function confirmMeal(mealSlotId: string, suggestionId: string | null, overrideNote?: string) {
  if (!(await isAdmin())) return { error: "Admin only." };

  await prisma.mealSlot.update({
    where: { id: mealSlotId },
    data: {
      confirmedSuggestionId: suggestionId,
      adminOverrideNote: overrideNote?.trim() || null,
      status: suggestionId ? "CONFIRMED" : "PENDING",
    },
  });

  revalidatePath("/dashboard/meals");
  revalidatePath("/admin/meal-plan");
  return { success: true };
}

export async function setSlotStatus(mealSlotId: string, status: "PENDING" | "CONFIRMED" | "GROCERIES_BOUGHT" | "HANDLED") {
  if (!(await isAdmin())) return { error: "Admin only." };
  await prisma.mealSlot.update({ where: { id: mealSlotId }, data: { status } });
  revalidatePath("/dashboard/meals");
  revalidatePath("/admin/meal-plan");
  return { success: true };
}

// ---------- Helpers (cook/prep/shop/clean) ----------

export async function addHelper(mealSlotId: string, userId: string, helpType: string) {
  if (!(await isAdmin())) return { error: "Admin only." };
  await prisma.mealHelper.create({ data: { mealSlotId, userId, helpType } });
  revalidatePath("/dashboard/meals");
  revalidatePath("/admin/meal-plan");
  return { success: true };
}

export async function removeHelper(helperId: string) {
  if (!(await isAdmin())) return { error: "Admin only." };
  await prisma.mealHelper.delete({ where: { id: helperId } });
  revalidatePath("/dashboard/meals");
  revalidatePath("/admin/meal-plan");
  return { success: true };
}

// ---------- Groceries ----------

export async function addGroceryItem(formData: FormData) {
  if (!(await isAdmin())) return { error: "Admin only." };
  const mealSlotId = formData.get("mealSlotId") as string;
  const name = ((formData.get("name") as string) ?? "").trim();
  const category = ((formData.get("category") as string) ?? "Other").trim();
  const quantity = ((formData.get("quantity") as string) ?? "").trim() || null;
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;
  if (!mealSlotId || !name) return { error: "Missing fields." };

  await prisma.groceryItem.create({ data: { mealSlotId, name, category, quantity, notes } });
  revalidatePath("/dashboard/meals");
  revalidatePath("/admin/meal-plan");
  return { success: true };
}

export async function toggleBought(itemId: string, bought: boolean) {
  if (!(await isAdmin())) return { error: "Admin only." };
  await prisma.groceryItem.update({ where: { id: itemId }, data: { bought } });
  revalidatePath("/dashboard/meals");
  revalidatePath("/admin/meal-plan");
  return { success: true };
}

export async function deleteGroceryItem(itemId: string) {
  if (!(await isAdmin())) return { error: "Admin only." };
  await prisma.groceryItem.delete({ where: { id: itemId } });
  revalidatePath("/dashboard/meals");
  revalidatePath("/admin/meal-plan");
  return { success: true };
}

// ---------- Voting completion summary (for admin panel + user tracker) ----------

async function votingCompletionSummary() {
  const tripId = await getCurrentTripId();
  if (!tripId) return null;

  const requiredSlots = await prisma.mealSlot.findMany({
    where: { tripId, isOptional: false },
    select: { id: true },
  });
  const requiredCount = requiredSlots.length;

  const approvedUsers = await prisma.user.findMany({
    where: {
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
