"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendBedBumpEmail } from "@/lib/resend";
import { isAuthzError, requireApprovedMember, requireApprovedMemberOf } from "@/lib/authz";

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

  revalidatePath("/dashboard/sleeping");
  return { success: true };
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

  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

export async function deleteBed(bedId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  await prisma.bedAssignment.deleteMany({ where: { bedId } });
  await prisma.bed.delete({ where: { id: bedId } });
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

  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

export async function adminUnassignBed(userId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  await prisma.bedAssignment.deleteMany({ where: { userId } });
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

/**
 * Bed prices feed each member's bill. Once someone has paid, moving them to a
 * bed priced differently would silently change what they owe, so that's the
 * organizer's call, not a tap on the sleeping page.
 */
async function paidBedChangeError(userId: string, toAdjustment: number): Promise<string | null> {
  const current = await prisma.bedAssignment.findUnique({
    where: { userId },
    select: { bed: { select: { priceAdjustment: true } } },
  });
  if ((current?.bed.priceAdjustment ?? 0) === toAdjustment) return null;
  const paid = await prisma.payment.count({ where: { userId, status: "COMPLETED" } });
  return paid > 0 ? "You've already paid, and that bed is priced differently. Ask the organizer to move you." : null;
}

/** Thrown inside a bed transaction to roll it back with a clear reason. */
class BedError extends Error {}

function bedRaceError(err: unknown): { error: string } | null {
  if (err instanceof BedError) return { error: err.message };
  const code = (err as { code?: string })?.code;
  // P2002 unique violation, P2034 serialization failure — someone else got there first.
  if (code === "P2002" || code === "P2034") return { error: "Someone else just changed that bed — refresh and try again." };
  return null;
}

export async function claimBedSlot(bedId: string) {
  const bed = await prisma.bed.findUnique({ where: { id: bedId } });
  if (!bed) return { error: "Bed not found." };

  // Authorize against *this bed's* trip, not merely "is approved somewhere":
  // the bedId comes from the caller, and an approved member of another trip
  // would otherwise be able to claim a bed on this one.
  const auth = await requireApprovedMemberOf(bed.tripId);
  if (isAuthzError(auth)) return { error: auth.error };

  if (bed.womenOnly) {
    const me = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { gender: true },
    });
    if (me?.gender !== "female") {
      return { error: "This bed is reserved for female members." };
    }
  }

  const priceError = await paidBedChangeError(auth.id, bed.priceAdjustment);
  if (priceError) return { error: priceError };

  try {
    // Counting the occupants and then inserting is a race: two members tapping
    // the same last slot can both read "one free" and both insert, putting
    // three people in a double. Doing the count and the insert inside one
    // serializable transaction makes the loser fail rather than overfill.
    await prisma.$transaction(
      async (tx) => {
        const taken = await tx.bedAssignment.count({ where: { bedId } });
        // Claiming is for empty beds. A half-full double is shared only when
        // the person in it accepts a request — never by surprise.
        if (taken > 0) {
          throw new BedError(
            bed.type === "DOUBLE" ? "Someone's in this bed now — ask to share it instead." : "That bed is already full.",
          );
        }
        // Leaving any previous bed is part of the same transaction, so a
        // failure here can never strand someone with no bed at all.
        await tx.bedAssignment.deleteMany({ where: { userId: auth.id } });
        await tx.bedAssignment.create({ data: { bedId, userId: auth.id } });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (err) {
    const raced = bedRaceError(err);
    if (raced) return raced;
    throw err;
  }

  revalidatePath("/dashboard/sleeping");
  return { success: true };
}


export async function leaveBedSlot() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId || userId === "admin") return { error: "Sign in first." };

  const priceError = await paidBedChangeError(userId, 0);
  if (priceError) return { error: priceError };
  await prisma.bedAssignment.deleteMany({ where: { userId } });
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

/**
 * Female members can claim a single bed even if it's already taken — the
 * current occupant is moved out and notified by email. This is verified
 * server-side by reading user.gender from the DB.
 */
export async function bumpFromSingle(bedId: string) {
  const bed = await prisma.bed.findUnique({ where: { id: bedId } });
  if (!bed) return { error: "Bed not found." };

  const auth = await requireApprovedMemberOf(bed.tripId);
  if (isAuthzError(auth)) return { error: auth.error };

  const me = await prisma.user.findUnique({ where: { id: auth.id } });
  if (!me) return { error: "Account not found." };
  if (me.gender !== "female") {
    return { error: "Bumping a single is only available to members whose profile is set to female." };
  }

  if (bed.type !== "SINGLE") return { error: "You can only bump from single beds." };

  const priceError = await paidBedChangeError(me.id, bed.priceAdjustment);
  if (priceError) return { error: priceError };

  let occupant: { userId: string; user: { email: string; name: string } };
  try {
    // Re-read the bed inside a serializable transaction: two bumps at once,
    // or the occupant changing in between, must not overfill the single.
    occupant = await prisma.$transaction(
      async (tx) => {
        const current = await tx.bedAssignment.findMany({
          where: { bedId },
          include: { user: { select: { id: true, email: true, name: true, gender: true } } },
        });
        if (current.length === 0) throw new BedError("Bed is empty — just claim it normally.");
        const occ = current[0];
        if (occ.userId === me.id) throw new BedError("You're already in this bed.");
        if (occ.user.gender === "female") {
          throw new BedError("Another female member already has this single — you can't bump them.");
        }
        if (bed.priceAdjustment !== 0) {
          const paid = await tx.payment.count({ where: { userId: occ.userId, status: "COMPLETED" } });
          if (paid > 0) throw new BedError("They've already paid for this bed. Ask the organizer to sort it out.");
        }
        await tx.bedAssignment.deleteMany({ where: { userId: me.id } });
        await tx.bedAssignment.delete({ where: { id: occ.id } });
        await tx.bedAssignment.create({ data: { bedId, userId: me.id } });
        return occ;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (err) {
    const raced = bedRaceError(err);
    if (raced) return raced;
    throw err;
  }

  try {
    await sendBedBumpEmail(occupant.user.email, occupant.user.name, bed.label);
  } catch (e) {
    // The move already happened; a failed email shouldn't look like it didn't.
    console.error("Bed bump email failed:", e);
  }

  revalidatePath("/dashboard/sleeping");
  return { success: true };
}



/**
 * Request to share a double bed that already has one occupant.
 * The occupant must accept before the requester is added.
 */
export async function requestBedmate(bedId: string, toUserId: string) {
  const auth = await requireApprovedMember();
  if (isAuthzError(auth)) return { error: auth.error };
  if (auth.id === toUserId) return { error: "You can't request yourself." };

  const bed = await prisma.bed.findUnique({
    where: { id: bedId },
    include: { assignments: true },
  });
  if (!bed) return { error: "Bed not found." };
  // requireApprovedMember already read the caller's trip, so this is a
  // comparison rather than a second query.
  if (auth.tripId !== bed.tripId) return { error: "That isn't on your trip." };
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
  return { success: true };
}

export async function respondToBedmateRequest(requestId: string, accept: boolean) {
  const auth = await requireApprovedMember();
  if (isAuthzError(auth)) return { error: auth.error };

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

  // Accept: requester gets moved into this bed. The requester must still be
  // an approved member of this trip (they may have withdrawn since asking).
  const requester = await prisma.user.findUnique({
    where: { id: req.fromUserId },
    select: { tripId: true, status: true, gender: true },
  });
  if (
    !requester ||
    requester.tripId !== req.bed.tripId ||
    !["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"].includes(requester.status)
  ) {
    return { error: "They're no longer on the trip." };
  }
  if (req.bed.womenOnly && requester.gender !== "female") {
    return { error: "This bed is reserved for female members." };
  }
  const priceError = await paidBedChangeError(req.fromUserId, req.bed.priceAdjustment);
  if (priceError) return { error: "They've already paid, and this bed is priced differently. Ask the organizer." };

  try {
    await prisma.$transaction(
      async (tx) => {
        const current = await tx.bedAssignment.findMany({ where: { bedId: req.bedId } });
        if (!current.some((a) => a.userId === auth.id)) throw new BedError("You're no longer in this bed — can't accept.");
        if (current.length >= 2) throw new BedError("Bed is now full — can't accept.");
        await tx.bedAssignment.deleteMany({ where: { userId: req.fromUserId } });
        await tx.bedAssignment.create({ data: { bedId: req.bedId, userId: req.fromUserId } });
        await tx.bedmateRequest.update({
          where: { id: requestId },
          data: { status: "ACCEPTED", respondedAt: new Date() },
        });
        // Other pending requests for this bed, or any other pending request
        // the requester sent, are now stale — decline them so a different
        // occupant can't unexpectedly move them again.
        await tx.bedmateRequest.updateMany({
          where: {
            status: "PENDING",
            id: { not: requestId },
            OR: [{ bedId: req.bedId }, { fromUserId: req.fromUserId }],
          },
          data: { status: "DECLINED", respondedAt: new Date() },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (err) {
    const raced = bedRaceError(err);
    if (raced) return raced;
    throw err;
  }

  revalidatePath("/dashboard/sleeping");
  return { success: true };
}

export async function cancelBedmateRequest(requestId: string) {
  const auth = await requireApprovedMember();
  if (isAuthzError(auth)) return { error: auth.error };

  const req = await prisma.bedmateRequest.findUnique({ where: { id: requestId } });
  if (!req) return { error: "Request not found." };
  if (req.fromUserId !== auth.id) return { error: "Not your request to cancel." };
  if (req.status !== "PENDING") return { error: "Already handled." };

  await prisma.bedmateRequest.delete({ where: { id: requestId } });
  revalidatePath("/dashboard/sleeping");
  return { success: true };
}
