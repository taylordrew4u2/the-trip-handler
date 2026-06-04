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

/**
 * One-click default house layout — admin can edit / add / delete after.
 * Bedrooms 1, 2, 5: 1 Queen each. Bedroom 3: 1 King + 1 Twin. Bedroom 4: 5 Twins.
 * Queens and the King are stored as DOUBLE (2 slots each); Twins are SINGLE.
 */
const DEFAULT_HOUSE: { room: string; label: string; type: "SINGLE" | "DOUBLE" }[] = [
  { room: "Bedroom 1", label: "Queen Bed", type: "DOUBLE" },
  { room: "Bedroom 2", label: "Queen Bed", type: "DOUBLE" },
  { room: "Bedroom 3", label: "King Bed", type: "DOUBLE" },
  { room: "Bedroom 3", label: "Twin Bed", type: "SINGLE" },
  { room: "Bedroom 4", label: "Twin Bed 1", type: "SINGLE" },
  { room: "Bedroom 4", label: "Twin Bed 2", type: "SINGLE" },
  { room: "Bedroom 4", label: "Twin Bed 3", type: "SINGLE" },
  { room: "Bedroom 4", label: "Twin Bed 4", type: "SINGLE" },
  { room: "Bedroom 4", label: "Twin Bed 5", type: "SINGLE" },
  { room: "Bedroom 5", label: "Queen Bed", type: "DOUBLE" },
];

export async function seedDefaultHouseLayout(tripId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  if (!tripId) return { error: "Missing trip." };

  await prisma.bed.createMany({
    data: DEFAULT_HOUSE.map((b) => ({
      tripId,
      room: b.room,
      label: b.label,
      type: b.type,
      womenOnly: false,
    })),
  });

  revalidatePath("/admin/sleeping");
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

/**
 * Auto-seed the default 5-bedroom layout if the trip has no beds yet.
 * Safe to call on every page load — only seeds when zero beds exist.
 */
export async function ensureSleepingSetup() {
  const { getActiveTrip } = await import("@/lib/trip");
  const trip = await getActiveTrip();
  if (!trip) return;

  const bedCount = await prisma.bed.count({ where: { tripId: trip.id } });
  if (bedCount === 0) {
    await prisma.bed.createMany({
      data: DEFAULT_HOUSE.map((b) => ({
        tripId: trip.id,
        room: b.room,
        label: b.label,
        type: b.type,
        womenOnly: false,
      })),
    });
  }
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

export async function editBed(bedId: string, formData: FormData) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const label = ((formData.get("label") as string) ?? "").trim();
  const room = ((formData.get("room") as string) ?? "").trim() || null;
  const type = (formData.get("type") as string) === "SINGLE" ? "SINGLE" : "DOUBLE";
  const womenOnly = Boolean(formData.get("womenOnly"));

  if (!label) return { error: "Label can't be empty." };

  const bed = await prisma.bed.findUnique({
    where: { id: bedId },
    include: { assignments: true },
  });
  if (!bed) return { error: "Bed not found." };

  if (type === "SINGLE" && bed.type === "DOUBLE" && bed.assignments.length > 1) {
    return { error: "Can't switch to single — two people are already in this bed. Unassign one first." };
  }

  await prisma.bed.update({
    where: { id: bedId },
    data: { label, room, type, womenOnly },
  });

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

  if (bed.womenOnly) {
    const me = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { gender: true },
    });
    if (me?.gender !== "female") {
      return { error: "This bed is reserved for female members." };
    }
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

const APPROVED_STATUSES = ["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"];

async function requireApprovedSelf() {
  const session = await getServerSession(authOptions);
  const u = session?.user as { id?: string; role?: string; status?: string } | undefined;
  if (!u?.id || u.id === "admin" || u.role === "ADMIN") {
    return { error: "Sign in as a participant first." } as const;
  }
  if (!APPROVED_STATUSES.includes(u.status ?? "")) {
    return { error: "You need to be approved first." } as const;
  }
  return { id: u.id } as const;
}

/**
 * Request to share a double bed that already has one occupant.
 * The occupant must accept before the requester is added.
 */
export async function requestBedmate(bedId: string, toUserId: string) {
  const auth = await requireApprovedSelf();
  if ("error" in auth) return auth;
  if (auth.id === toUserId) return { error: "You can't request yourself." };

  const bed = await prisma.bed.findUnique({
    where: { id: bedId },
    include: { assignments: true },
  });
  if (!bed) return { error: "Bed not found." };
  const me = await prisma.user.findUnique({ where: { id: auth.id }, select: { tripId: true } });
  if (me?.tripId !== bed.tripId) return { error: "Wrong trip." };
  if (bed.type !== "DOUBLE") return { error: "Only double beds can be shared." };
  if (bed.assignments.length === 0) {
    return { error: "Bed is empty — just claim it normally." };
  }
  if (bed.assignments.length >= 2) return { error: "That bed is already full." };
  if (bed.assignments.some((a) => a.userId === auth.id)) {
    return { error: "You're already in this bed." };
  }
  if (!bed.assignments.some((a) => a.userId === toUserId)) {
    return { error: "That person isn't in this bed anymore." };
  }

  if (bed.womenOnly) {
    const gender = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { gender: true },
    });
    if (gender?.gender !== "female") {
      return { error: "This bed is reserved for female members." };
    }
  }

  const existing = await prisma.bedmateRequest.findUnique({
    where: { bedId_fromUserId_toUserId: { bedId, fromUserId: auth.id, toUserId } },
  });
  if (existing?.status === "PENDING") {
    return { error: "You already have a pending request for this bed." };
  }

  await prisma.bedmateRequest.upsert({
    where: { bedId_fromUserId_toUserId: { bedId, fromUserId: auth.id, toUserId } },
    create: { bedId, fromUserId: auth.id, toUserId, status: "PENDING" },
    update: { status: "PENDING", respondedAt: null },
  });

  revalidatePath("/dashboard/sleeping");
  revalidatePath("/admin/sleeping");
  return { success: true };
}

export async function respondToBedmateRequest(requestId: string, accept: boolean) {
  const auth = await requireApprovedSelf();
  if ("error" in auth) return auth;

  const req = await prisma.bedmateRequest.findUnique({
    where: { id: requestId },
    include: { bed: { include: { assignments: true } } },
  });
  if (!req) return { error: "Request not found." };
  if (req.toUserId !== auth.id) return { error: "Not your request to respond to." };
  if (req.status !== "PENDING") return { error: "Already handled." };

  if (!accept) {
    await prisma.bedmateRequest.update({
      where: { id: requestId },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    revalidatePath("/dashboard/sleeping");
    return { success: true };
  }

  // Accept: requester gets moved into this bed.
  if (req.bed.assignments.length >= 2) {
    return { error: "Bed is now full — can't accept." };
  }
  if (!req.bed.assignments.some((a) => a.userId === auth.id)) {
    return { error: "You're no longer in this bed — can't accept." };
  }

  await prisma.$transaction([
    prisma.bedAssignment.deleteMany({ where: { userId: req.fromUserId } }),
    prisma.bedAssignment.create({ data: { bedId: req.bedId, userId: req.fromUserId } }),
    prisma.bedmateRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
    // Other pending requests for this bed, or any other pending request
    // the requester sent, are now stale — decline them so a different
    // occupant can't unexpectedly move them again.
    prisma.bedmateRequest.updateMany({
      where: {
        status: "PENDING",
        id: { not: requestId },
        OR: [{ bedId: req.bedId }, { fromUserId: req.fromUserId }],
      },
      data: { status: "DECLINED", respondedAt: new Date() },
    }),
  ]);

  revalidatePath("/dashboard/sleeping");
  revalidatePath("/admin/sleeping");
  return { success: true };
}

export async function cancelBedmateRequest(requestId: string) {
  const auth = await requireApprovedSelf();
  if ("error" in auth) return auth;

  const req = await prisma.bedmateRequest.findUnique({ where: { id: requestId } });
  if (!req) return { error: "Request not found." };
  if (req.fromUserId !== auth.id) return { error: "Not your request to cancel." };
  if (req.status !== "PENDING") return { error: "Already handled." };

  await prisma.bedmateRequest.delete({ where: { id: requestId } });
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}
