"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { notifyAdmin } from "@/lib/resend";

export async function withdrawSelf() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; status?: string; role?: string } | undefined;
  if (!user?.id || user.id === "admin" || user.role === "ADMIN") {
    return { error: "Sign in as a participant first." };
  }

  const current = await prisma.user.findUnique({ where: { id: user.id } });
  if (!current) return { error: "Account not found." };

  if (current.status === "CONFIRMED_PAID") {
    return { error: "You've already paid. Contact the organizer to discuss a refund." };
  }
  if (current.status === "CANCELLED") {
    return { error: "You've already withdrawn." };
  }
  // Partly paid (e.g. a confirmed Venmo deposit): money needs sorting out first.
  const paid = await prisma.payment.count({ where: { userId: user.id, status: "COMPLETED" } });
  if (paid > 0) {
    return { error: "You've already paid part of the trip. Contact the organizer to discuss a refund." };
  }

  await prisma.$transaction([
    prisma.bedAssignment.deleteMany({ where: { userId: user.id } }),
    prisma.userContribution.deleteMany({ where: { userId: user.id } }),
    prisma.bedmateRequest.deleteMany({
      where: { status: "PENDING", OR: [{ fromUserId: user.id }, { toUserId: user.id }] },
    }),
    prisma.user.update({ where: { id: user.id }, data: { status: "CANCELLED" } }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/sleeping");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const trip = current.tripId
    ? await prisma.trip.findUnique({ where: { id: current.tripId }, select: { owner: { select: { email: true } } } })
    : null;
  await notifyAdmin({
    to: trip?.owner?.email ?? undefined,
    subject: `${current.name} pulled out of the trip`,
    intro: `They withdrew before paying. Their bed and contributions have been released so someone else can take the spot.`,
    details: { Name: current.name, Email: current.email, "Previous status": current.status },
    actionLabel: "View applicants",
    actionUrl: current.tripId ? `${baseUrl}/dashboard/my-trips/${current.tripId}` : `${baseUrl}/dashboard/my-trips`,
  });

  return { success: true };
}
