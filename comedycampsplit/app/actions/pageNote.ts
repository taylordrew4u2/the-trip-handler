"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "ADMIN";
}

export async function setPageNote(pageKey: string, body: string) {
  if (!(await requireAdmin())) return { error: "Admin only." };
  const trimmed = body.trim();
  const key = pageKey.trim();
  if (!key) return { error: "Missing page key." };

  if (!trimmed) {
    await prisma.pageNote.deleteMany({ where: { pageKey: key } });
  } else {
    await prisma.pageNote.upsert({
      where: { pageKey: key },
      create: { pageKey: key, body: trimmed },
      update: { body: trimmed },
    });
  }

  revalidatePath("/admin/page-notes");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/" + key);
  return { success: true };
}
