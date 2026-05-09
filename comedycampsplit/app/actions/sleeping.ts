"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendBedBumpEmail } from "@/lib/resend";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "ADMIN";
}

export async function addBed(formData: FormData) {
  if (!(await requireAdmin())) return { error: "Admin only." };

  const tripId = formData.get("tripId") as string;
  const label = (formData.get("label") as string)?.trim();
  const room = ((formData.get("room") as string) ?? "").trim() || null;
  const type = (formData.get("type") as string) === "SINGLE" ? "SINGLE" : "DOUBLE";
  const womenOnly = Boolean(formData.get("womenOnly"));

  const countRaw = (formData.get("count") as string) ?? "1";
  const count = Math.min(20, Math.max(1, parseInt(countRaw, 10) || 1));

  if (!tripId || !label) return { error: "Missing trip or label." };

  if (count === 1) {
    await prisma.bed.create({
      data: { tripId, label, room, type, womenOnly },
    });
  } else {
    // Bulk: append " 1", " 2", ... so the room gets multiple uniquely-labeled beds.
    await prisma.bed.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        tripId,
        label: `${label} ${i + 1}`,
        room,
        type,
        womenOnly,
      })),
    });
  }

  revalidatePath("/admin/sleeping");
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

export async function deleteBed(bedId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  await prisma.bedAssignment.deleteMany({ where: { bedId } });
  await prisma.bed.delete({ where: { id: bedId } });
  revalidatePath("/admin/sleeping");
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

export async function adminUnassignBed(userId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  await prisma.bedAssignment.deleteMany({ where: { userId } });
  revalidatePath("/admin/sleeping");
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

export async function claimBedSlot(bedId: string) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; role?: string; status?: string } | undefined;
  if (!sessionUser?.id || sessionUser.id === "admin" || sessionUser.role === "ADMIN") {
    return { error: "Sign in as a participant first." };
  }
  if (!["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"].includes(sessionUser.status ?? "")) {
    return { error: "You need to be approved first." };
  }

  const bed = await prisma.bed.findUnique({
    where: { id: bedId },
    include: { assignments: true },
  });
  if (!bed) return { error: "Bed not found." };

  const capacity = bed.type === "DOUBLE" ? 2 : 1;
  if (bed.assignments.length >= capacity) {
    return { error: "That bed is already full." };
  }

  // Move user from any prior bed first.
  await prisma.bedAssignment.deleteMany({ where: { userId: sessionUser.id } });

  try {
    await prisma.bedAssignment.create({
      data: { bedId, userId: sessionUser.id },
    });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") return { error: "You're already in a bed." };
    throw err;
  }

  revalidatePath("/admin/sleeping");
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

export async function leaveBedSlot() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId || userId === "admin") return { error: "Sign in first." };

  await prisma.bedAssignment.deleteMany({ where: { userId } });
  revalidatePath("/admin/sleeping");
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

/**
 * Female members can claim a single bed even if it's already taken — the
 * current occupant is moved out and notified by email. This is verified
 * server-side by reading user.gender from the DB.
 */
export async function bumpFromSingle(bedId: string) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; role?: string; status?: string } | undefined;
  if (!sessionUser?.id || sessionUser.id === "admin" || sessionUser.role === "ADMIN") {
    return { error: "Sign in as a participant first." };
  }
  if (!["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"].includes(sessionUser.status ?? "")) {
    return { error: "You need to be approved first." };
  }

  const me = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!me) return { error: "Account not found." };
  if (me.gender !== "female") {
    return { error: "Bumping a single is only available to members whose profile is set to female." };
  }

  const bed = await prisma.bed.findUnique({
    where: { id: bedId },
    include: { assignments: { include: { user: true } } },
  });
  if (!bed) return { error: "Bed not found." };
  if (bed.type !== "SINGLE") return { error: "You can only bump from single beds." };
  if (bed.assignments.length === 0) {
    return { error: "Bed is empty — just claim it normally." };
  }

  const occupant = bed.assignments[0];
  if (occupant.userId === me.id) {
    return { error: "You're already in this bed." };
  }
  if (occupant.user.gender === "female") {
    return { error: "Another female member already has this single — you can't bump them." };
  }

  await prisma.$transaction([
    prisma.bedAssignment.deleteMany({ where: { userId: me.id } }),
    prisma.bedAssignment.deleteMany({ where: { id: occupant.id } }),
    prisma.bedAssignment.create({ data: { bedId, userId: me.id } }),
  ]);

  await sendBedBumpEmail(occupant.user.email, occupant.user.name, bed.label);

  revalidatePath("/admin/sleeping");
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}
