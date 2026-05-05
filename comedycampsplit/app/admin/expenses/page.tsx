import { prisma } from "@/lib/db";
import { AdminExpensesClient } from "./AdminExpensesClient";

export default async function AdminExpensesPage() {
  const expenses = await prisma.expense.findMany({
    orderBy: { createdAt: "desc" },
    include: { submitter: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">💸 Expenses</h1>
      <AdminExpensesClient expenses={expenses} />
    </div>
  );
}
