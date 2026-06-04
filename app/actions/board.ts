"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const APPROVED = new Set(["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"]);

const MAX_LEN = 2000;

export async function postComment(body: string) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; status?: string; role?: string } | undefined;
  if (!user?.id || user.id === "admin" || user.role === "ADMIN") {
    return { error: "Sign in as a participant to post." };
  }
  if (!APPROVED.has(user.status ?? "")) {
    return { error: "Only approved members can post." };
  }

  const trimmed = body.trim();
  if (!trimmed) return { error: "Say something." };
  if (trimmed.length > MAX_LEN) return { error: `Keep it under ${MAX_LEN} characters.` };

  await prisma.comment.create({
    data: { userId: user.id, body: trimmed },
  });
  revalidatePath("/dashboard/board");
  return { success: true };
}

export async function deleteComment(commentId: string) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return { error: "Sign in first." };

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) return { success: true };

  const isOwner = comment.userId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) return { error: "You can only delete your own posts." };

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath("/dashboard/board");
  revalidatePath("/admin/board");
  return { success: true };
}

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "💯", "🎭"] as const;

export async function toggleReaction(commentId: string, emoji: string) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; status?: string; role?: string } | undefined;
  if (!user?.id || user.id === "admin" || user.role === "ADMIN") {
    return { error: "Sign in as a participant to react." };
  }
  if (!APPROVED.has(user.status ?? "")) {
    return { error: "Only approved members can react." };
  }
  if (!REACTION_EMOJIS.includes(emoji as (typeof REACTION_EMOJIS)[number])) {
    return { error: "Unsupported reaction." };
  }

  const existing = await prisma.reaction.findUnique({
    where: { commentId_userId_emoji: { commentId, userId: user.id, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({
      data: { commentId, userId: user.id, emoji },
    });
  }
  revalidatePath("/dashboard/board");
  revalidatePath("/admin/board");
  return { success: true };
}
