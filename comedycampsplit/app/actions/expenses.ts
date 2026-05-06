"use server";

import { prisma } from "@/lib/db";
import { deleteBlob, uploadReceipt } from "@/lib/blob";
import { revalidatePath } from "next/cache";

export async function addExpense(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const userId = formData.get("userId") as string;
  const title = formData.get("title") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const category = formData.get("category") as string;
  const notes = (formData.get("notes") as string) || null;
  const receipt = formData.get("receipt");

  if (!tripId || !userId || !title || isNaN(amount)) {
    return { error: "Missing required fields" };
  }

  const receiptFile = receipt instanceof File && receipt.size > 0 ? receipt : null;
  if (receiptFile) {
    const maxBytes = 10 * 1024 * 1024;
    if (receiptFile.size > maxBytes) {
      return { error: "Receipt must be 10MB or less" };
    }
    const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (receiptFile.type && !allowedTypes.has(receiptFile.type)) {
      return { error: "Receipt must be a PDF or image" };
    }
  }

  const expense = await prisma.expense.create({
    data: {
      tripId,
      submittedBy: userId,
      title,
      amount,
      category,
      notes: notes || undefined,
    },
  });

  if (receiptFile) {
    let uploadedUrl: string | null = null;
    try {
      uploadedUrl = await uploadReceipt(receiptFile, expense.id);
      await prisma.expense.update({
        where: { id: expense.id },
        data: { receiptUrl: uploadedUrl },
      });
    } catch (err) {
      console.error("Receipt upload failed:", err);
      if (uploadedUrl) {
        try {
          await deleteBlob(uploadedUrl);
        } catch (cleanupErr) {
          console.error("Failed to cleanup uploaded receipt:", cleanupErr);
        }
      }
      await prisma.expense.delete({ where: { id: expense.id } });
      return { error: "Receipt upload failed. Please try again." };
    }
  }

  // Update total expenses
  const total = await prisma.expense.aggregate({
    where: { tripId, approved: true },
    _sum: { amount: true },
  });
  await prisma.trip.update({
    where: { id: tripId },
    data: { totalExpenses: total._sum.amount ?? 0 },
  });

  revalidatePath("/dashboard/expenses");
  revalidatePath("/admin/expenses");
  return { success: true };
}

export async function approveExpense(expenseId: string) {
  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: { approved: true },
  });

  const total = await prisma.expense.aggregate({
    where: { tripId: expense.tripId, approved: true },
    _sum: { amount: true },
  });
  await prisma.trip.update({
    where: { id: expense.tripId },
    data: { totalExpenses: total._sum.amount ?? 0 },
  });

  revalidatePath("/admin/expenses");
  return { success: true };
}

export async function deleteExpense(expenseId: string) {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) return { success: true };

  if (expense.receiptUrl) {
    try {
      await deleteBlob(expense.receiptUrl);
    } catch (err) {
      console.error("Failed to delete receipt blob:", err);
    }
  }

  await prisma.expense.delete({ where: { id: expenseId } });

  const total = await prisma.expense.aggregate({
    where: { tripId: expense.tripId, approved: true },
    _sum: { amount: true },
  });
  await prisma.trip.update({
    where: { id: expense.tripId },
    data: { totalExpenses: total._sum.amount ?? 0 },
  });

  revalidatePath("/admin/expenses");
  revalidatePath("/dashboard/expenses");
  return { success: true };
}
