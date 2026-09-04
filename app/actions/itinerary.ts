"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { isAuthzError, requireApprovedActor } from "@/lib/authz";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return (session?.user as { role?: string } | undefined)?.role === "ADMIN";
}

async function requireApprovedUser(): Promise<{ id: string; isAdmin: boolean } | { error: string }> {
  // Delegates to the shared guard so approval is read from the database, not
  // from the sign-in-time JWT. See lib/authz.ts.
  const actor = await requireApprovedActor();
  if (isAuthzError(actor)) return { error: actor.error };
  return { id: actor.id, isAdmin: actor.isAdmin };
}

function revalidateItinerary() {
  revalidatePath("/admin/itinerary");
  revalidatePath("/dashboard/itinerary");
}

export async function upsertDay(formData: FormData) {
  if (!(await requireAdmin())) return { error: "Admin only." };

  const id = (formData.get("id") as string | null) || null;
  const tripId = formData.get("tripId") as string;
  const dayNumberRaw = formData.get("dayNumber") as string;
  const dayNumber = parseInt(dayNumberRaw, 10);
  if (!tripId || Number.isNaN(dayNumber)) return { error: "Missing trip or day number." };

  const dateRaw = (formData.get("date") as string) || "";
  const date = dateRaw ? new Date(dateRaw) : null;

  const data = {
    title: ((formData.get("title") as string) ?? "").trim() || null,
    notes: ((formData.get("notes") as string) ?? "").trim() || null,
    date,
  };

  if (id) {
    await prisma.day.update({ where: { id }, data: { ...data, dayNumber } });
  } else {
    try {
      await prisma.day.create({ data: { ...data, tripId, dayNumber } });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "P2002") return { error: `Day ${dayNumber} already exists.` };
      throw err;
    }
  }

  revalidatePath("/admin/itinerary");
  revalidatePath("/dashboard/itinerary");
  return { success: true };
}

export async function deleteDay(id: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  await prisma.day.delete({ where: { id } });
  revalidatePath("/admin/itinerary");
  revalidatePath("/dashboard/itinerary");
  return { success: true };
}

export async function addLodgingPhoto(tripId: string, url: string, caption?: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  if (!tripId || !url) return { error: "Missing trip or photo URL." };

  const max = await prisma.lodgingPhoto.findFirst({
    where: { tripId },
    orderBy: { position: "desc" },
  });

  await prisma.lodgingPhoto.create({
    data: {
      tripId,
      url,
      caption: caption?.trim() || null,
      position: (max?.position ?? -1) + 1,
    },
  });

  revalidatePath("/admin/trip");
  revalidatePath("/dashboard/itinerary");
  return { success: true };
}

export async function updateLodgingPhotoCaption(id: string, caption: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  await prisma.lodgingPhoto.update({
    where: { id },
    data: { caption: caption.trim() || null },
  });
  revalidatePath("/admin/trip");
  revalidatePath("/dashboard/itinerary");
  return { success: true };
}

export async function deleteLodgingPhoto(id: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  // Best-effort delete the blob too — don't block if it fails.
  const photo = await prisma.lodgingPhoto.findUnique({ where: { id } });
  if (photo) {
    try {
      const { del } = await import("@vercel/blob");
      await del(photo.url);
    } catch (err) {
      console.error("Failed to delete blob:", err);
    }
  }
  await prisma.lodgingPhoto.delete({ where: { id } });
  revalidatePath("/admin/trip");
  revalidatePath("/dashboard/itinerary");
  return { success: true };
}

// ---------- Itinerary items (admin only) ----------

function readItemFields(formData: FormData) {
  return {
    title: ((formData.get("title") as string) ?? "").trim(),
    time: ((formData.get("time") as string) ?? "").trim() || null,
    description: ((formData.get("description") as string) ?? "").trim() || null,
    location: ((formData.get("location") as string) ?? "").trim() || null,
    notes: ((formData.get("notes") as string) ?? "").trim() || null,
  };
}

export async function createItineraryItem(formData: FormData) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const dayId = formData.get("dayId") as string;
  const fields = readItemFields(formData);
  if (!dayId || !fields.title) return { error: "Day and title are required." };

  const max = await prisma.itineraryItem.aggregate({
    where: { dayId },
    _max: { orderIndex: true },
  });
  const orderIndex = (max._max.orderIndex ?? -1) + 1;

  await prisma.itineraryItem.create({
    data: { dayId, orderIndex, ...fields },
  });

  revalidateItinerary();
  return { success: true };
}

export async function updateItineraryItem(itemId: string, formData: FormData) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const fields = readItemFields(formData);
  if (!fields.title) return { error: "Title is required." };

  await prisma.itineraryItem.update({
    where: { id: itemId },
    data: fields,
  });

  revalidateItinerary();
  return { success: true };
}

export async function deleteItineraryItem(itemId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  await prisma.itineraryItem.delete({ where: { id: itemId } });
  revalidateItinerary();
  return { success: true };
}

export async function reorderItineraryItem(itemId: string, direction: "up" | "down") {
  if (!(await requireAdmin())) return { error: "Admin only." };

  const item = await prisma.itineraryItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Item not found." };

  const neighbor = await prisma.itineraryItem.findFirst({
    where: {
      dayId: item.dayId,
      orderIndex: direction === "up" ? { lt: item.orderIndex } : { gt: item.orderIndex },
    },
    orderBy: { orderIndex: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return { success: true };

  await prisma.$transaction([
    prisma.itineraryItem.update({
      where: { id: item.id },
      data: { orderIndex: neighbor.orderIndex },
    }),
    prisma.itineraryItem.update({
      where: { id: neighbor.id },
      data: { orderIndex: item.orderIndex },
    }),
  ]);

  revalidateItinerary();
  return { success: true };
}

export async function moveItineraryItemToDay(itemId: string, newDayId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  if (!newDayId) return { error: "Pick a day." };

  const max = await prisma.itineraryItem.aggregate({
    where: { dayId: newDayId },
    _max: { orderIndex: true },
  });
  const orderIndex = (max._max.orderIndex ?? -1) + 1;

  await prisma.itineraryItem.update({
    where: { id: itemId },
    data: { dayId: newDayId, orderIndex },
  });

  revalidateItinerary();
  return { success: true };
}

export async function toggleItineraryItemPin(itemId: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const item = await prisma.itineraryItem.findUnique({
    where: { id: itemId },
    select: { pinned: true },
  });
  if (!item) return { error: "Item not found." };
  await prisma.itineraryItem.update({
    where: { id: itemId },
    data: { pinned: !item.pinned },
  });
  revalidateItinerary();
  return { success: true };
}

// ---------- Itinerary comments (any approved user) ----------

export async function createItineraryComment(itemId: string, body: string) {
  const auth = await requireApprovedUser();
  if ("error" in auth) return auth;
  const text = body.trim();
  if (!text) return { error: "Comment can't be empty." };

  await prisma.itineraryComment.create({
    data: { itineraryItemId: itemId, userId: auth.id, body: text },
  });

  revalidateItinerary();
  return { success: true };
}

export async function updateItineraryComment(commentId: string, body: string) {
  const auth = await requireApprovedUser();
  if ("error" in auth) return auth;
  const text = body.trim();
  if (!text) return { error: "Comment can't be empty." };

  const c = await prisma.itineraryComment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });
  if (!c) return { error: "Comment not found." };
  if (c.userId !== auth.id) return { error: "Not your comment." };

  await prisma.itineraryComment.update({
    where: { id: commentId },
    data: { body: text },
  });

  revalidateItinerary();
  return { success: true };
}

export async function deleteItineraryComment(commentId: string) {
  const auth = await requireApprovedUser();
  if ("error" in auth) return auth;

  const c = await prisma.itineraryComment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });
  if (!c) return { success: true };
  if (c.userId !== auth.id && !auth.isAdmin) {
    return { error: "Not your comment." };
  }

  await prisma.itineraryComment.delete({ where: { id: commentId } });
  revalidateItinerary();
  return { success: true };
}
