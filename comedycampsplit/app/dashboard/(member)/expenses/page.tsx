import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ExpensesClient } from "./ExpensesClient";
import { PageNote } from "@/components/PageNote";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { getUserStatus, isApproved } from "@/lib/approval";
import { getUserTripOrActive } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  if (!isApproved(await getUserStatus())) return <ApprovalRequired what="Expenses" />;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const trip = await getUserTripOrActive(userId);

  const expenses = await prisma.expense.findMany({
    where: trip ? { tripId: trip.id } : { tripId: "__none__" },
    orderBy: { createdAt: "desc" },
    include: { submitter: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <PageNote pageKey="expenses" />
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Expenses</h1>
        <p className="text-stone-500 text-sm mt-1">Shared trip expenses tracked by the admin.</p>
      </div>
      <ExpensesClient expenses={expenses} />
    </div>
  );
}
