"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateBio(userId: string, bio: string) {
  await prisma.user.update({ where: { id: userId }, data: { bio } });
  revalidatePath("/dashboard/roster");
  return { success: true };
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
  revalidatePath("/dashboard/roster");
  return { success: true };
}

export async function updateProfile(userId: string, data: {
  name?: string;
  username?: string;
  bio?: string;
  phone?: string;
}) {
  if (!userId || userId === "admin") {
    return { error: "You need to be signed in as a participant." };
  }
  try {
    await prisma.user.update({ where: { id: userId }, data });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") return { error: "That username is already taken." };
    throw err;
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/roster");
  revalidatePath("/dashboard/profile");
  return { success: true };
}
