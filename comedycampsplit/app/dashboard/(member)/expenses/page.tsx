import { prisma } from "@/lib/db";
import { ExpensesClient } from "./ExpensesClient";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { getUserStatus, isApproved } from "@/lib/approval";

export default async function ExpensesPage() {
  if (!isApproved(await getUserStatus())) return <ApprovalRequired what="Expenses" />;

  const expenses = await prisma.expense.findMany({
    orderBy: { createdAt: "desc" },
    include: { submitter: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Expenses</h1>
        <p className="text-stone-500 text-sm mt-1">Shared trip expenses tracked by the admin.</p>
      </div>
      <ExpensesClient expenses={expenses} />
    </div>
  );
}
