import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureMealPlanSetup, votingCompletionSummary } from "@/app/actions/meals";
import { MealsPlanner } from "@/components/MealsPlanner";
import type { Phase } from "@/lib/meals";

export const dynamic = "force-dynamic";

export default async function ManageTripMealsPage({
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
    select: { id: true, name: true },
  });
  if (!trip) redirect("/dashboard/my-trips");

  await ensureMealPlanSetup(tripId);

  const [slots, phase, completion] = await Promise.all([
    prisma.mealSlot.findMany({
      where: { tripId },
      orderBy: { orderIndex: "asc" },
      include: {
        suggestions: {
          orderBy: { createdAt: "asc" },
          include: { submittedBy: { select: { id: true, name: true, username: true } } },
        },
        votes: { select: { id: true, userId: true, suggestionId: true, isDontCare: true } },
        helpers: { include: { user: { select: { id: true, name: true, username: true } } } },
        groceries: { orderBy: [{ category: "asc" }, { name: "asc" }] },
      },
    }),
    prisma.mealPlanPhase.findUnique({ where: { tripId } }),
    votingCompletionSummary(tripId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/my-trips/${tripId}`} className="text-xs text-stone-500 hover:text-stone-800">
          ← {trip.name}
        </Link>
        <h1 className="font-serif text-3xl font-medium text-stone-900 mt-2">Meal plan</h1>
        <p className="text-stone-500 text-sm mt-1">
          Move the poll through its phases, finalize meals, and manage the grocery list.
        </p>
      </div>
      <MealsPlanner
        currentUserId={userId}
        isAdmin
        tripId={tripId}
        slots={slots}
        phase={(phase?.currentPhase ?? "suggestions_open") as Phase}
        completion={completion}
      />
    </div>
  );
}
