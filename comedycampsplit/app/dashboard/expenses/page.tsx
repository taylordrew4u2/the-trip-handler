import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ExpensesClient } from "./ExpensesClient";

export default async function ExpensesPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id ?? "";

  const [trip, expenses] = await Promise.all([
    prisma.trip.findFirst(),
    prisma.expense.findMany({
      orderBy: { createdAt: "desc" },
      include: { submitter: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">💸 Expenses</h1>
      <ExpensesClient expenses={expenses} tripId={trip?.id ?? ""} userId={userId} />
    </div>
  );
}
