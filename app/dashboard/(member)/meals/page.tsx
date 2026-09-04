import { prisma } from "@/lib/db";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { isAuthzError, requireApprovedMember } from "@/lib/authz";
import { ensureMealPlanSetup, votingCompletionSummary } from "@/app/actions/meals";
import { MealsPlanner } from "@/components/MealsPlanner";
import { SignOutButton } from "@/components/SignOutButton";
import { PageNote } from "@/components/PageNote";
import { getUserTrip } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function MealsPage() {
  // Approval is read from the database, not the sign-in-time JWT, so a
  // member removed from the trip loses access on their next request.
  const member = await requireApprovedMember();
  if (isAuthzError(member)) return <ApprovalRequired what="Meal planning" />;
  const userId = member.id;

  const trip = await getUserTrip(userId);
  if (trip) await ensureMealPlanSetup(trip.id);

  const [slots, phase, completion] = await Promise.all([
    prisma.mealSlot.findMany({
      where: trip ? { tripId: trip.id } : { tripId: "__none__" },
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
    trip ? prisma.mealPlanPhase.findUnique({ where: { tripId: trip.id } }) : null,
    trip ? votingCompletionSummary(trip.id) : null,
  ]);

  return (
    <div className="space-y-6">
      <PageNote pageKey="meals" />
      <MealsPlanner
        currentUserId={userId}
        isAdmin={false}
        tripId={trip?.id ?? ""}
        slots={slots}
        phase={(phase?.currentPhase ?? "suggestions_open") as "suggestions_open" | "voting_open" | "admin_finalizing" | "finalized"}
        completion={completion}
      />

      <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-stone-600">Done for now? You can sign out.</p>
        <SignOutButton />
      </div>
    </div>
  );
}
