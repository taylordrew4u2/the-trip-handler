"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notifyAdmin, sendFormUnlockedEmail } from "@/lib/resend";
import { isAuthzError, requireApprovedMember } from "@/lib/authz";

const STRING_ARRAY_FIELDS = new Set([
  "bringingItems",
  "dietaryRestrictions",
  "drinkPrefs",
  "workOnGoals",
  "contentAcks",
  "jokeProtectionAcks",
  "activitiesInterested",
  "securityDepositAcks",
  "houseRulesAcks",
]);

const BOOL_FIELDS = new Set(["age21Confirmed", "vanAck", "substanceFreeAck"]);

const REQUIRED_STRING_FIELDS = ["fullName", "phoneNumber", "maxBudget"];

const REQUIRED_HOUSE_RULES = [
  "shared",
  "food",
  "noStealing",
  "quietHours",
  "alcohol",
  "damage",
  "respect",
  "groupTrip",
];

const REQUIRED_JOKE_PROTECTION = ["noPostMaterial", "workshopPrivate", "groupOk", "noRepeat", "noPost"];

const REQUIRED_SECURITY_DEPOSIT = ["payDeposit", "returned", "forfeitAndCharged", "hostNotLiable"];

export async function submitGuestForm(formData: FormData) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  if (!sessionUser?.id || sessionUser.id === "admin" || sessionUser.role === "ADMIN") {
    return { error: "You need to be signed in as a participant." };
  }
  const userId = sessionUser.id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found." };

  const existing = await prisma.guestForm.findUnique({ where: { userId } });
  if (existing?.locked) {
    return { error: "Your form is locked. Request edit access from admin before resubmitting." };
  }

  // Build the data object from form fields
  const data: Record<string, string | string[] | boolean | null> = {};
  const seenArrays = new Set<string>();

  for (const [rawKey, rawValue] of formData.entries()) {
    const key = rawKey.endsWith("[]") ? rawKey.slice(0, -2) : rawKey;
    const value = rawValue.toString();

    if (STRING_ARRAY_FIELDS.has(key)) {
      if (!seenArrays.has(key)) {
        data[key] = formData.getAll(rawKey).map((v) => v.toString()).filter(Boolean);
        seenArrays.add(key);
      }
      continue;
    }
    if (BOOL_FIELDS.has(key)) {
      data[key] = value === "on" || value === "true";
      continue;
    }
    data[key] = value.trim() || null;
  }

  // Required field validation
  for (const f of REQUIRED_STRING_FIELDS) {
    if (!data[f]) return { error: `Please fill in ${f}.` };
  }
  if (!data.age21Confirmed) return { error: "You must confirm you're 21 or older." };
  if (!data.substanceFreeAck) return { error: "You must agree this is a drug- and alcohol-free trip." };

  const houseRules = (data.houseRulesAcks as string[]) || [];
  for (const rule of REQUIRED_HOUSE_RULES) {
    if (!houseRules.includes(rule)) return { error: "Please agree to all house rules." };
  }
  const jokeProtection = (data.jokeProtectionAcks as string[]) || [];
  for (const rule of REQUIRED_JOKE_PROTECTION) {
    if (!jokeProtection.includes(rule)) return { error: "Please agree to all material / content protection items." };
  }
  const securityDeposit = (data.securityDepositAcks as string[]) || [];
  for (const rule of REQUIRED_SECURITY_DEPOSIT) {
    if (!securityDeposit.includes(rule)) return { error: "Please agree to all security deposit terms." };
  }

  // Make sure all expected array fields exist (so unchecked groups become [])
  for (const f of STRING_ARRAY_FIELDS) {
    if (!(f in data)) data[f] = [];
  }

  // Lock the form after every successful submit so the user can't keep
  // changing things without admin approval.
  const dataWithLock = { ...data, locked: true, editRequested: false };
  type UpsertInput = Parameters<typeof prisma.guestForm.upsert>[0];
  await prisma.guestForm.upsert({
    where: { userId },
    create: { ...dataWithLock, userId } as UpsertInput["create"],
    update: dataWithLock as UpsertInput["update"],
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/intake");
  revalidatePath("/admin/intake");

  if (!existing) {
    // First-time submission — let admin know there's a new application to review.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await notifyAdmin({
      subject: `${user.name} submitted their guest form`,
      intro: `A new applicant just finished the pre-approval form. Review it and approve or reject.`,
      details: {
        Name: user.name,
        Email: user.email,
        "Max budget": (data.maxBudget as string | null) ?? null,
        "Substance-free ack": data.substanceFreeAck ? "Agreed" : "NOT AGREED",
      },
      actionLabel: "Review application",
      actionUrl: `${baseUrl}/dashboard/my-trips`,
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
  revalidatePath("/admin/intake");

  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (u) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await notifyAdmin({
      subject: `${u.name} requested edit access to their guest form`,
      intro: `They want to make changes to a previously submitted form. Unlock it from your trip's applicant list if that's fine.`,
      details: { Name: u.name, Email: u.email },
      actionLabel: "Open & unlock",
      actionUrl: `${baseUrl}/dashboard/my-trips`,
    });
  }
  return { success: true };
}

export async function unlockGuestForm(userId: string) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") return { error: "Admin only." };

  const form = await prisma.guestForm.findUnique({ where: { userId } });
  if (!form) return { error: "No form to unlock." };

  await prisma.guestForm.update({
    where: { userId },
    data: { locked: false, editRequested: false },
  });
  revalidatePath("/dashboard/intake");
  revalidatePath("/admin/intake");
  revalidatePath(`/admin/intake/${userId}`);

  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  if (u) await sendFormUnlockedEmail(u.email, u.name);

  return { success: true };
}

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

  const data: Record<string, string | string[] | boolean | null | Date> = {};

  for (const f of PREFERENCES_STRING_FIELDS) {
    const v = (formData.get(f) as string | null)?.trim() ?? "";
    data[f] = v || null;
  }
  for (const f of PREFERENCES_ARRAY_FIELDS) {
    data[f] = formData.getAll(`${f}[]`).map((v) => v.toString()).filter(Boolean);
    // Also accept the non-bracketed key (for safety)
    if ((data[f] as string[]).length === 0) {
      data[f] = formData.getAll(f).map((v) => v.toString()).filter(Boolean);
    }
  }
  for (const f of PREFERENCES_BOOL_FIELDS) {
    const v = formData.get(f);
    data[f] = v === "on" || v === "true";
  }

  // Required-field validation: every text field must be filled (use "N/A" if it doesn't apply).
  for (const f of PREFERENCES_REQUIRED) {
    if (!data[f]) {
      return { error: `Please answer "${f}" — use "N/A" if it doesn't apply.` };
    }
  }
  if (!data.vanAck) {
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
  revalidatePath(`/admin/intake/${sessionUser.id}`);
  return { success: true };
}
