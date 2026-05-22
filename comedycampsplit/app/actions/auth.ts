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
  tripId: z.string().min(1, "Pick which trip you're applying to."),
});

export async function signupAction(formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    username: (formData.get("username") as string) || undefined,
    bio: (formData.get("bio") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    tripId: (formData.get("tripId") as string) || "",
  };

  const parsed = SignupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const trip = await prisma.trip.findUnique({ where: { id: raw.tripId } });
  if (!trip || !trip.isApplicationOpen) {
    return { error: "That trip isn't accepting applications." };
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
      tripId: trip.id,
    },
  });

  return { success: true };
}
