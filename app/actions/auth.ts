"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const SignupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  username: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
  // Optional: present when applying to a specific trip via an invite link.
  // Absent when creating a plain account (e.g. to host your own trip).
  inviteToken: z.string().optional(),
});

export async function signupAction(formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    username: (formData.get("username") as string) || undefined,
    bio: (formData.get("bio") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    inviteToken: (formData.get("inviteToken") as string) || undefined,
  };

  const parsed = SignupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // If they came through an invite link, tie the new account to that trip.
  let tripId: string | null = null;
  if (raw.inviteToken) {
    const trip = await prisma.trip.findUnique({ where: { inviteToken: raw.inviteToken } });
    if (!trip || !trip.isApplicationOpen) {
      return { error: "This invite isn't accepting applications." };
    }
    tripId = trip.id;
  }

  const existing = await prisma.user.findUnique({ where: { email: raw.email } });
  if (existing) return { error: "Email already registered" };

  if (raw.username) {
    const existingUsername = await prisma.user.findUnique({ where: { username: raw.username } });
    if (existingUsername) return { error: "Username already taken" };
  }

  const hashed = await bcrypt.hash(raw.password, 10);
  await prisma.user.create({
    data: {
      name: raw.name,
      email: raw.email,
      password: hashed,
      username: raw.username || null,
      bio: raw.bio || null,
      phone: raw.phone || null,
      status: "PENDING",
      role: "PARTICIPANT",
      tripId,
    },
  });

  return { success: true };
}
