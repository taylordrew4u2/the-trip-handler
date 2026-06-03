"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const APPROVED = new Set(["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"]);

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user as { id?: string; role?: string; status?: string } | undefined;
}

export async function addContribution(formData: FormData) {
  const u = await getSessionUser();
  if (!u?.id) return { error: "Sign in first." };
  const isAdmin = u.role === "ADMIN";
  if (!isAdmin && !APPROVED.has(u.status ?? "")) {
    return { error: "You need to be approved first." };
  }

  const tripId = formData.get("tripId") as string;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const category = (formData.get("category") as string) || null;

  if (!tripId || !title) return { error: "Missing fields" };

  // Members can only add to their own trip; admins can add to any trip.
  if (!isAdmin) {
    const me = await prisma.user.findUnique({ where: { id: u.id }, select: { tripId: true } });
    if (me?.tripId !== tripId) return { error: "Wrong trip." };
  }

  const contribution = await prisma.contribution.create({
    data: { tripId, title, description: description || undefined, category: category || undefined },
  });

  // If a real user added this from the member form, auto-sign them up.
  if (!isAdmin) {
    await prisma.userContribution.create({
      data: { userId: u.id, contributionId: contribution.id },
    });
  }

  revalidatePath("/dashboard/contributions");
  revalidatePath("/admin/contributions");
  return { success: true };
}

export async function signUpForContribution(_userId: string, contributionId: string, notes?: string) {
  const u = await getSessionUser();
  if (!u?.id) return { error: "Sign in first." };
  if (!APPROVED.has(u.status ?? "")) return { error: "You need to be approved first." };

  // Verify the contribution belongs to the user's trip.
  const [contribution, me] = await Promise.all([
    prisma.contribution.findUnique({ where: { id: contributionId }, select: { tripId: true } }),
    prisma.user.findUnique({ where: { id: u.id }, select: { tripId: true } }),
  ]);
  if (!contribution || contribution.tripId !== me?.tripId) return { error: "Wrong trip." };

  try {
    await prisma.userContribution.create({
      data: { userId: u.id, contributionId, notes },
    });
    revalidatePath("/dashboard/contributions");
    return { success: true };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return { error: "Already signed up for this item" };
    }
    console.error("signUpForContribution error:", err);
    return { error: "Failed to sign up for contribution" };
  }
}

export async function removeContribution(_userId: string, contributionId: string) {
  const u = await getSessionUser();
  if (!u?.id) return { error: "Sign in first." };

  await prisma.userContribution.deleteMany({
    where: { userId: u.id, contributionId },
  });
  revalidatePath("/dashboard/contributions");
  return { success: true };
}

export async function deleteContributionItem(contributionId: string) {
  const u = await getSessionUser();
  if (u?.role !== "ADMIN") return { error: "Admin only." };

  await prisma.userContribution.deleteMany({ where: { contributionId } });
  await prisma.contribution.delete({ where: { id: contributionId } });
  revalidatePath("/admin/contributions");
  revalidatePath("/dashboard/contributions");
  return { success: true };
}
