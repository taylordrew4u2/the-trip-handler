"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { isAuthzError, requireApprovedActor, requireApprovedMember } from "@/lib/authz";

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user as { id?: string; role?: string; status?: string } | undefined;
}

export async function addContribution(formData: FormData) {
  // Approval is read from the database, not the JWT — see lib/authz.ts.
  const actor = await requireApprovedActor();
  if (isAuthzError(actor)) return { error: actor.error };
  const u = { id: actor.id };
  const isAdmin = actor.isAdmin;

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
  const auth = await requireApprovedMember();
  if (isAuthzError(auth)) return { error: auth.error };
  const u = { id: auth.id };

  // Verify the contribution belongs to the caller's trip. The guard already
  // read that trip, so this is a comparison rather than a second query.
  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
    select: { tripId: true },
  });
  if (!contribution || contribution.tripId !== auth.tripId) return { error: "That isn't on your trip." };

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
