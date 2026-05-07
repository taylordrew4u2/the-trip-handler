"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return (session?.user as { role?: string } | undefined)?.role === "ADMIN";
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
    schedule: ((formData.get("schedule") as string) ?? "").trim() || null,
    breakfast: ((formData.get("breakfast") as string) ?? "").trim() || null,
    lunch: ((formData.get("lunch") as string) ?? "").trim() || null,
    dinner: ((formData.get("dinner") as string) ?? "").trim() || null,
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
