import { prisma } from "@/lib/db";
import { AdminExpensesClient } from "./AdminExpensesClient";

export default async function AdminExpensesPage() {
  const [trip, expenses] = await Promise.all([
    prisma.trip.findFirst(),
    prisma.expense.findMany({
      orderBy: { createdAt: "desc" },
      include: { submitter: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Expenses</h1>
        <p className="text-stone-500 text-sm mt-1">Track and approve shared trip expenses.</p>
      </div>
      <AdminExpensesClient expenses={expenses} tripId={trip?.id ?? ""} />
    </div>
  );
}
