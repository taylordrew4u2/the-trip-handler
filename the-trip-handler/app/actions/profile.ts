"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
  await prisma.user.update({ where: { id: userId }, data: { bio } });
  revalidatePath("/dashboard/roster");
  return { success: true };
}

export async function updateAvatar(userId: string, avatarUrl: string) {
  const auth = await requireSelf(userId);
  if ("error" in auth) return auth;
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
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}
