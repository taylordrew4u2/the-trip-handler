"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addExpense(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const userId = formData.get("userId") as string;
  const title = formData.get("title") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const category = formData.get("category") as string;
  const notes = (formData.get("notes") as string) || null;

  if (!tripId || !userId || !title || isNaN(amount)) {
    return { error: "Missing required fields" };
  }

  await prisma.expense.create({
    data: { tripId, submittedBy: userId, title, amount, category, notes: notes || undefined },
  });

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
  const expense = await prisma.expense.delete({ where: { id: expenseId } });

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
