import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { isApproved } from "@/lib/approval";
import { ensureMealPlanSetup, votingCompletionSummary } from "@/app/actions/meals";
import { MealsPlanner } from "@/components/MealsPlanner";

export const dynamic = "force-dynamic";

export default async function MealsPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; status?: string } | undefined;
  if (!isApproved(sessionUser?.status)) return <ApprovalRequired what="Meal planning" />;
  const userId = sessionUser?.id ?? "";

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
      currentUserId={userId}
      isAdmin={false}
      tripId={trip?.id ?? ""}
      slots={slots}
      phase={(phase?.currentPhase ?? "suggestions_open") as "suggestions_open" | "voting_open" | "admin_finalizing" | "finalized"}
      completion={completion}
    />
  );
}
