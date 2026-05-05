"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addContribution(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const category = (formData.get("category") as string) || null;

  if (!tripId || !title) return { error: "Missing fields" };

  await prisma.contribution.create({
    data: { tripId, title, description: description || undefined, category: category || undefined },
  });

  revalidatePath("/dashboard/contributions");
  revalidatePath("/admin/contributions");
  return { success: true };
}

export async function signUpForContribution(userId: string, contributionId: string, notes?: string) {
  try {
    await prisma.userContribution.create({
      data: { userId, contributionId, notes },
    });
    revalidatePath("/dashboard/contributions");
    return { success: true };
  } catch (err) {
    // Prisma unique constraint violation (P2002) means already signed up
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return { error: "Already signed up for this item" };
    }
    console.error("signUpForContribution error:", err);
    return { error: "Failed to sign up for contribution" };
  }
}

export async function removeContribution(userId: string, contributionId: string) {
  await prisma.userContribution.deleteMany({
    where: { userId, contributionId },
  });
  revalidatePath("/dashboard/contributions");
  return { success: true };
}

export async function deleteContributionItem(contributionId: string) {
  await prisma.userContribution.deleteMany({ where: { contributionId } });
  await prisma.contribution.delete({ where: { id: contributionId } });
  revalidatePath("/admin/contributions");
  revalidatePath("/dashboard/contributions");
  return { success: true };
}
