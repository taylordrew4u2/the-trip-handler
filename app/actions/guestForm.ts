"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notifyAdmin, sendFormUnlockedEmail } from "@/lib/resend";
import { isAuthzError, requireApprovedMember } from "@/lib/authz";
import { INTAKE_FIELDS } from "@/lib/guestForm";
import { intakeQuestions, fillIntakeAmounts, defaultIntakeQuestions, visibleQuestions, readQuestionAnswers, readIntakeSnapshot } from "@/lib/intakeQuestions";

/** Who hears about guest-form activity: the trip's owner, else the site admin inbox. */
async function tripOwnerEmail(tripId: string | null): Promise<string | undefined> {
  if (!tripId) return undefined;
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { owner: { select: { email: true } } },
  });
  return trip?.owner?.email ?? undefined;
}

export async function submitGuestForm(formData: FormData) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  if (!sessionUser?.id || sessionUser.id === "admin" || sessionUser.role === "ADMIN") {
    return { error: "You need to be signed in as a participant." };
  }
  const userId = sessionUser.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { trip: { select: { id: true, disabledSections: true, depositAmount: true, intakeQuestions: true } } },
  });
  if (!user) return { error: "User not found." };
  // The form is an application to a specific trip.
  if (!user.trip) return { error: "Join a trip with an invite link or code first." };
  const off = user.trip.disabledSections;

  const existing = await prisma.guestForm.findUnique({ where: { userId } });
  if (existing?.locked) {
    return { error: "Your form is locked. Request edit access from the organizer before resubmitting." };
  }

  // Only the questions this trip asks are read; everything else in the
  // request (ids, lock flags, preference answers) is ignored.
  const questions = visibleQuestions(fillIntakeAmounts(intakeQuestions(user.trip.intakeQuestions, off), user.trip.depositAmount), off);
  // Requirements come from the saved template, never from the browser.
  const parsed = readQuestionAnswers(formData, questions);
  const data = parsed.answers;
  const problem = parsed.error;
  if (problem) return { error: problem };
  if (!data.fullName || !data.phoneNumber) return { error: "Please fill in your name and phone number." };

  const previous = readIntakeSnapshot(existing?.intakeSnapshot);
  const oldAnswers = Object.fromEntries(INTAKE_FIELDS.map(f => [f.name, existing?.[f.name as keyof typeof existing] ?? null]));
  const earlierQuestions = previous?.questions ?? (existing ? visibleQuestions(fillIntakeAmounts(defaultIntakeQuestions(off), user.trip.depositAmount), off) : []);
  const archived = earlierQuestions.filter(q => !questions.some(current => current.id === q.id));
  const snapshot = {
    questions: [...questions, ...archived.map(q => ({ ...q, hidden: true }))],
    answers: { ...oldAnswers, ...previous?.answers, ...data },
  };
  // Custom answers live in the snapshot; only known fields become database columns.
  const builtIn = Object.fromEntries(Object.entries(data).filter(([key]) => INTAKE_FIELDS.some(f => f.name === key)));
  const dataWithLock = { ...builtIn, intakeSnapshot: JSON.parse(JSON.stringify(snapshot)), locked: true, editRequested: false };
  type UpsertInput = Parameters<typeof prisma.guestForm.upsert>[0];
  await prisma.guestForm.upsert({
    where: { userId },
    create: { ...dataWithLock, userId } as UpsertInput["create"],
    update: dataWithLock as UpsertInput["update"],
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/intake");
  revalidatePath(`/dashboard/my-trips/${user.trip.id}/applicants/${userId}`);

  if (!existing) {
    // First-time submission — let the organizer know there's an application to review.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await notifyAdmin({
      to: await tripOwnerEmail(user.trip.id),
      subject: `${user.name} submitted their guest form`,
      intro: `A new applicant just finished the pre-approval form. Review it and approve or reject.`,
      details: {
        Name: user.name,
        Email: user.email,
        "Max budget": (data.maxBudget as string | null) ?? null,
      },
      actionLabel: "Review application",
      actionUrl: `${baseUrl}/dashboard/my-trips/${user.trip.id}/applicants/${userId}`,
    });
  }

  return { success: true };
}

export async function requestFormEditAccess() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  if (!sessionUser?.id || sessionUser.id === "admin" || sessionUser.role === "ADMIN") {
    return { error: "Sign in first." };
  }
  const userId = sessionUser.id;
  const form = await prisma.guestForm.findUnique({ where: { userId } });
  if (!form) return { error: "Submit your form first." };
  if (!form.locked) return { error: "Your form is already editable." };
  if (form.editRequested) return { success: true };

  await prisma.guestForm.update({
    where: { userId },
    data: { editRequested: true },
  });
  revalidatePath("/dashboard/intake");

  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, tripId: true } });
  if (u) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await notifyAdmin({
      to: await tripOwnerEmail(u.tripId),
      subject: `${u.name} requested edit access to their guest form`,
      intro: `They want to make changes to a previously submitted form. Unlock it from their answers page if that's fine.`,
      details: { Name: u.name, Email: u.email },
      actionLabel: "Open & unlock",
      actionUrl: u.tripId ? `${baseUrl}/dashboard/my-trips/${u.tripId}/applicants/${userId}` : `${baseUrl}/dashboard/my-trips`,
    });
  }
  return { success: true };
}

export async function unlockGuestForm(userId: string) {
  const session = await getServerSession(authOptions);
  const caller = session?.user as { id?: string; role?: string } | undefined;
  if (!caller?.id) return { error: "Sign in first." };

  // The organizer of the applicant's trip (or the site admin) may unlock.
  const applicant = await prisma.user.findUnique({
    where: { id: userId },
    select: { trip: { select: { id: true, ownerId: true } } },
  });
  const isOwner = Boolean(applicant?.trip && applicant.trip.ownerId === caller.id);
  if (!isOwner && caller.role !== "ADMIN") return { error: "Not your trip." };

  const form = await prisma.guestForm.findUnique({ where: { userId } });
  if (!form) return { error: "No form to unlock." };

  await prisma.guestForm.update({
    where: { userId },
    data: { locked: false, editRequested: false },
  });
  revalidatePath("/dashboard/intake");
  if (applicant?.trip) revalidatePath(`/dashboard/my-trips/${applicant.trip.id}/applicants/${userId}`);

  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (u) await sendFormUnlockedEmail(u.email, u.name);

  return { success: true };
}

// Preference questions that only apply when the trip has that section.
const PREFERENCES_SECTION_FIELDS: Record<string, string[]> = {
  transport: [
    "comingFrom",
    "centralPickup",
    "preferredArea",
    "preferredAreaOther",
    "carsick",
    "needsFrontSeat",
    "luggageSize",
    "bulkyItems",
    "willingToDrive",
    "vanAck",
  ],
  meals: [
    "hasAllergies",
    "allergiesList",
    "allergySeverity",
    "dietaryOther",
    "willNotEat",
    "likedFoods",
    "snackRequests",
    "drinkOther",
    "communalMeals",
    "helpCookClean",
    "dietaryRestrictions",
    "drinkPrefs",
  ],
  itinerary: ["workOnOther"],
};

const PREFERENCES_STRING_FIELDS = [
  // Emergency contact
  "emergencyName",
  "emergencyPhone",
  // Van
  "comingFrom",
  "centralPickup",
  "preferredArea",
  "preferredAreaOther",
  "carsick",
  "needsFrontSeat",
  "luggageSize",
  "bulkyItems",
  "willingToDrive",
  // Food
  "hasAllergies",
  "allergiesList",
  "allergySeverity",
  "dietaryOther",
  "willNotEat",
  "likedFoods",
  "snackRequests",
  "drinkOther",
  "communalMeals",
  "helpCookClean",
  // Activities / Workshop
  "workOnOther",
];

const PREFERENCES_ARRAY_FIELDS = new Set([
  "dietaryRestrictions",
  "drinkPrefs",
]);

const PREFERENCES_BOOL_FIELDS = new Set(["vanAck"]);

const PREFERENCES_REQUIRED = [
  "emergencyName",
  "emergencyPhone",
  "comingFrom",
  "centralPickup",
  "preferredArea",
  "carsick",
  "needsFrontSeat",
  "luggageSize",
  "bulkyItems",
  "willingToDrive",
  "hasAllergies",
  "allergiesList",
  "allergySeverity",
  "willNotEat",
  "likedFoods",
  "snackRequests",
  "communalMeals",
  "helpCookClean",
];

export async function updatePreferences(formData: FormData) {
  // Approval is read from the database, not the JWT — see lib/authz.ts.
  const auth = await requireApprovedMember();
  if (isAuthzError(auth)) return { error: auth.error };
  const sessionUser = { id: auth.id };

  const trip = await prisma.trip.findUnique({ where: { id: auth.tripId }, select: { disabledSections: true } });
  // Fields for sections this trip doesn't have are neither asked, required, nor overwritten.
  const skipped = new Set((trip?.disabledSections ?? []).flatMap((k) => PREFERENCES_SECTION_FIELDS[k] ?? []));

  const data: Record<string, string | string[] | boolean | null | Date> = {};

  for (const f of PREFERENCES_STRING_FIELDS) {
    if (skipped.has(f)) continue;
    const v = (formData.get(f) as string | null)?.trim() ?? "";
    data[f] = v || null;
  }
  for (const f of PREFERENCES_ARRAY_FIELDS) {
    if (skipped.has(f)) continue;
    data[f] = formData.getAll(`${f}[]`).map((v) => v.toString()).filter(Boolean);
    // Also accept the non-bracketed key (for safety)
    if ((data[f] as string[]).length === 0) {
      data[f] = formData.getAll(f).map((v) => v.toString()).filter(Boolean);
    }
  }
  for (const f of PREFERENCES_BOOL_FIELDS) {
    if (skipped.has(f)) continue;
    const v = formData.get(f);
    data[f] = v === "on" || v === "true";
  }

  // Required-field validation: every text field must be filled (use "N/A" if it doesn't apply).
  for (const f of PREFERENCES_REQUIRED) {
    if (skipped.has(f)) continue;
    if (!data[f]) {
      return { error: `Please answer "${f}" — use "N/A" if it doesn't apply.` };
    }
  }
  if (!skipped.has("vanAck") && !data.vanAck) {
    return { error: "Please acknowledge the van transportation expectations." };
  }

  data.preferencesSubmittedAt = new Date();

  type UpdateInput = Parameters<typeof prisma.guestForm.update>[0];
  const updateInput = data as UpdateInput["data"];
  await prisma.guestForm.update({
    where: { userId: sessionUser.id },
    data: updateInput,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/preferences");
  revalidatePath(`/dashboard/my-trips/${auth.tripId}/applicants/${sessionUser.id}`);
  return { success: true };
}
