"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SLEEP_TAG_BY_VALUE } from "@/lib/sleep";
import { isStoredFileUrl } from "@/lib/files";

const GENDERS = new Set(["female", "male", "non-binary", "other"]);

async function requireSelf(userId: string) {
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!sessionUserId || sessionUserId === "admin") {
    return { error: "You need to be signed in as a participant." } as const;
  }
  if (sessionUserId !== userId) {
    return { error: "You can only edit your own profile." } as const;
  }
  return { ok: true } as const;
}

export async function updateBio(userId: string, bio: string) {
  const auth = await requireSelf(userId);
  if ("error" in auth) return auth;
  if (typeof bio !== "string") return { error: "Invalid bio." };
  await prisma.user.update({ where: { id: userId }, data: { bio: bio.trim().slice(0, 1000) || null } });
  revalidatePath("/dashboard/roster");
  return { success: true };
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  const auth = await requireSelf(userId);
  if ("error" in auth) return auth;
  if (typeof avatarUrl !== "string" || !isStoredFileUrl(avatarUrl)) {
    return { error: "Invalid image URL." };
  }
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
  revalidatePath("/dashboard/roster");
  return { success: true };
}

export async function updateProfile(userId: string, data: {
  name?: string;
  username?: string;
  bio?: string;
  phone?: string;
  gender?: string;
  sleepTags?: string[];
  sleepNote?: string;
}) {
  const auth = await requireSelf(userId);
  if ("error" in auth) return auth;

  // Server actions accept any JSON, so build the update from known profile
  // fields only. Status, role, trip and price fields can never be set here.
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
  const update: {
    name?: string;
    username?: string | null;
    bio?: string | null;
    phone?: string | null;
    gender?: string | null;
    sleepTags?: string[];
    sleepNote?: string | null;
  } = {};
  const name = str(data?.name, 100);
  if (name !== undefined) {
    if (!name) return { error: "Name can't be empty." };
    update.name = name;
  }
  if (data?.username !== undefined) update.username = str(data.username, 40) || null;
  if (data?.bio !== undefined) update.bio = str(data.bio, 1000) || null;
  if (data?.phone !== undefined) update.phone = str(data.phone, 40) || null;
  if (data?.gender !== undefined) {
    const gender = str(data.gender, 20) || null;
    if (gender && !GENDERS.has(gender)) return { error: "Pick a gender from the list." };
    update.gender = gender;
  }
  if (data?.sleepTags !== undefined) {
    if (!Array.isArray(data.sleepTags)) return { error: "Invalid sleep tags." };
    update.sleepTags = data.sleepTags.filter((t): t is string => typeof t === "string" && SLEEP_TAG_BY_VALUE.has(t));
  }
  if (data?.sleepNote !== undefined) update.sleepNote = str(data.sleepNote, 500) || null;

  try {
    await prisma.user.update({ where: { id: userId }, data: update });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") return { error: "That username is already taken." };
    throw err;
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/roster");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}
