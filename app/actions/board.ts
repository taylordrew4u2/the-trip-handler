"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { isReactionEmoji } from "@/lib/reactions";
import { isAuthzError, requireApprovedMember } from "@/lib/authz";


const MAX_LEN = 2000;

export async function postComment(body: string) {
  // Status comes from the database, never from the session: the JWT is a
  // snapshot from sign-in and would still say APPROVED for someone since
  // removed from the trip. See lib/authz.ts.
  const auth = await requireApprovedMember();
  if (isAuthzError(auth)) return { error: auth.error };
  const user = { id: auth.id };

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



export async function toggleReaction(commentId: string, emoji: string) {
  // Status comes from the database, never from the session: the JWT is a
  // snapshot from sign-in and would still say APPROVED for someone since
  // removed from the trip. See lib/authz.ts.
  const auth = await requireApprovedMember();
  if (isAuthzError(auth)) return { error: auth.error };
  const user = { id: auth.id };
  if (!isReactionEmoji(emoji)) {
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
