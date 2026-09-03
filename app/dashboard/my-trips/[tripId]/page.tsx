import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { TripEditForm } from "./TripEditForm";
import { PricingPanel } from "./PricingPanel";
import { ContributionsPanel } from "./ContributionsPanel";
import { ExpensesPanel } from "./ExpensesPanel";
import { BedsPanel } from "./BedsPanel";

export const dynamic = "force-dynamic";

function isoDate(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function ManageTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ownerId: userId },
  });
  if (!trip) redirect("/dashboard/my-trips");

  const [contributions, expenses, beds] = await Promise.all([
    prisma.contribution.findMany({
      where: { tripId },
      orderBy: { createdAt: "desc" },
      include: { users: { include: { user: { select: { name: true } } } } },
    }),
    prisma.expense.findMany({
      where: { tripId },
      orderBy: { createdAt: "desc" },
      include: { submitter: { select: { name: true } } },
    }),
    prisma.bed.findMany({
      where: { tripId },
      orderBy: [{ room: "asc" }, { label: "asc" }],
      include: { assignments: { include: { user: { select: { name: true } } } } },
    }),
  ]);

  const contributionData = contributions.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    claimedBy: c.users.map((u) => u.user.name),
  }));

  const expenseData = expenses.map((e) => ({
    id: e.id,
    title: e.title,
    amount: e.amount,
    category: e.category,
    approved: e.approved,
    submitter: e.submitter?.name ?? null,
    receiptUrl: e.receiptUrl,
  }));

  const bedData = beds.map((b) => ({
    id: b.id,
    label: b.label,
    room: b.room,
    type: b.type,
    womenOnly: b.womenOnly,
    occupants: b.assignments.map((a) => a.user.name),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/my-trips"
          className="inline-flex items-center min-h-[44px] -ml-1 px-1 text-sm text-stone-500 hover:text-stone-800"
        >
          ← My trips
        </Link>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 break-words">
          {trip.name}
        </h1>
        <p className="text-stone-500 text-sm mt-1">Edit the details people see on your invite page.</p>
        <Link
          href={`/dashboard/my-trips/${trip.id}/meals`}
          className="inline-flex items-center min-h-[44px] mt-1 text-sm font-medium text-stone-900 underline underline-offset-2"
        >
          Manage meal poll →
        </Link>
      </div>
      <TripEditForm
        tripId={trip.id}
        initial={{
          name: trip.name,
          destination: trip.destination ?? "",
          startDate: isoDate(trip.startDate),
          endDate: isoDate(trip.endDate),
          description: trip.description ?? "",
          itinerary: trip.itinerary ?? "",
          lodging: trip.lodging ?? "",
          meals: trip.meals ?? "",
        }}
      />
      <PricingPanel
        tripId={trip.id}
        pricing={{
          housingPrice: trip.housingPrice,
          housingLocked: trip.housingLocked,
          transportPrice: trip.transportPrice,
          transportLocked: trip.transportLocked,
          mealsPrice: trip.mealsPrice,
          mealsLocked: trip.mealsLocked,
          isLocked: trip.isLocked,
          finalPrice: trip.finalPrice,
        }}
      />
      <BedsPanel tripId={trip.id} beds={bedData} />
      <ContributionsPanel tripId={trip.id} items={contributionData} />
      <ExpensesPanel expenses={expenseData} totalExpenses={trip.totalExpenses} />
    </div>
  );
}
