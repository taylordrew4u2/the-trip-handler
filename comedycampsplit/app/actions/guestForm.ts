"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const STRING_ARRAY_FIELDS = new Set([
  "bringingItems",
  "dietaryRestrictions",
  "drinkPrefs",
  "workOnGoals",
  "contentAcks",
  "jokeProtectionAcks",
  "activitiesInterested",
  "paymentAcks",
  "houseRulesAcks",
]);

const BOOL_FIELDS = new Set(["age21Confirmed", "vanAck", "substanceFreeAck"]);

const REQUIRED_STRING_FIELDS = ["fullName", "phoneNumber", "emergencyName", "emergencyPhone"];

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

export async function submitGuestForm(userId: string, formData: FormData) {
  if (!userId || userId === "admin") {
    return { error: "You need to be signed in as a participant." };
  }

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
  if (!data.vanAck) return { error: "Please acknowledge the van transportation expectations." };

  const houseRules = (data.houseRulesAcks as string[]) || [];
  for (const rule of REQUIRED_HOUSE_RULES) {
    if (!houseRules.includes(rule)) return { error: "Please agree to all house rules." };
  }
  const jokeProtection = (data.jokeProtectionAcks as string[]) || [];
  for (const rule of REQUIRED_JOKE_PROTECTION) {
    if (!jokeProtection.includes(rule)) return { error: "Please agree to all joke / material protection items." };
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
  return { success: true };
}

export async function requestFormEditAccess(userId: string) {
  if (!userId || userId === "admin") return { error: "Sign in first." };
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
  return { success: true };
}
