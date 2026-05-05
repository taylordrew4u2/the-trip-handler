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
  await prisma.user.update({ where: { id: userId }, data });
  revalidatePath("/dashboard");
  return { success: true };
}
