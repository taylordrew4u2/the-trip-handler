"use server";

import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { notifyAdmin, sendAdminAccessGrantedEmail } from "@/lib/resend";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return (session?.user as { role?: string } | undefined)?.role === "ADMIN";
}

const RequestSchema = z.object({
  name: z.string().min(2, "Enter your name."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

/**
 * Public: anyone can request admin access. Creates an account in the PENDING
 * admin-request state; an existing admin then approves it. Existing admins are
 * notified by email.
 */
export async function requestAdminAccess(formData: FormData) {
  const parsed = RequestSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      error:
        "An account with this email already exists. Ask an existing admin to grant it admin access.",
    };
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: "PARTICIPANT",
      status: "PENDING",
      adminRequest: "PENDING",
    },
  });

  await notifyAdmin({
    subject: "New admin access request",
    intro: `${name} has requested admin access.`,
    details: { Name: name, Email: email },
    actionLabel: "Review admin requests",
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/admins`,
  });

  return { success: true };
}

export async function approveAdminRequest(userId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: "ADMIN", adminRequest: "APPROVED" },
  });
  await sendAdminAccessGrantedEmail(user.email, user.name);
  revalidatePath("/admin/admins");
  return { success: true };
}

export async function rejectAdminRequest(userId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  await prisma.user.update({
    where: { id: userId },
    data: { adminRequest: "REJECTED" },
  });
  revalidatePath("/admin/admins");
  return { success: true };
}

/** Demote a database admin back to a regular participant. */
export async function revokeAdmin(userId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const session = await getServerSession(authOptions);
  const self = (session?.user as { id?: string } | undefined)?.id;
  if (self === userId) {
    return { error: "You can't revoke your own admin access." };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { role: "PARTICIPANT", adminRequest: "NONE" },
  });
  revalidatePath("/admin/admins");
  return { success: true };
}
