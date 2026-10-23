"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateIntakeQuestions } from "@/lib/intakeQuestions";

export async function saveIntakeQuestions(tripId: string, input: unknown) {
  const session = await getServerSession(authOptions);
  const ownerId = (session?.user as { id?: string } | undefined)?.id;
  if (!ownerId || ownerId === "admin") return { error: "Sign in as the trip organizer." };
  const trip = await prisma.trip.findFirst({ where: { id: tripId, ownerId }, select: { id: true } });
  if (!trip) return { error: "Not your trip." };
  const result = validateIntakeQuestions(input);
  if (result.error) return { error: result.error };
  await prisma.trip.update({ where: { id: tripId, ownerId }, data: { intakeQuestions: JSON.parse(JSON.stringify(result.questions)) } });
  revalidatePath(`/dashboard/my-trips/${tripId}/intake`);
  revalidatePath("/dashboard/intake");
  return { success: true };
}
