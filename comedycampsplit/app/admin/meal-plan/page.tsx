import { prisma } from "@/lib/db";
import { ensureMealPlanSetup, votingCompletionSummary } from "@/app/actions/meals";
import { MealsPlanner } from "@/components/MealsPlanner";

export const dynamic = "force-dynamic";

export default async function AdminMealPlanPage() {
  await ensureMealPlanSetup();

  const [trip, slots, phase, completion] = await Promise.all([
    prisma.trip.findFirst({ select: { id: true } }),
    prisma.mealSlot.findMany({
      orderBy: { orderIndex: "asc" },
      include: {
        suggestions: {
          orderBy: { createdAt: "asc" },
          include: { submittedBy: { select: { id: true, name: true, username: true } } },
        },
        votes: { select: { id: true, userId: true, suggestionId: true, isDontCare: true } },
        helpers: {
          include: { user: { select: { id: true, name: true, username: true } } },
        },
        groceries: { orderBy: [{ category: "asc" }, { name: "asc" }] },
      },
    }),
    prisma.mealPlanPhase.findFirst(),
    votingCompletionSummary(),
  ]);

  return (
    <MealsPlanner
      currentUserId="admin"
      isAdmin={true}
      tripId={trip?.id ?? ""}
      slots={slots}
      phase={(phase?.currentPhase ?? "suggestions_open") as "suggestions_open" | "voting_open" | "admin_finalizing" | "finalized"}
      completion={completion}
    />
  );
}
