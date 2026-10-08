import { prisma } from "@/lib/db";
import { ContributionItem } from "@/components/ContributionItem";
import { AddContributionForm } from "@/components/AddContributionForm";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { isAuthzError, requireApprovedMember } from "@/lib/authz";
import { PageNote } from "@/components/PageNote";
import { getUserTrip } from "@/lib/trip";

export default async function ContributionsPage() {
  // Approval is read from the database, not the sign-in-time JWT, so a
  // member removed from the trip loses access on their next request.
  const member = await requireApprovedMember();
  if (isAuthzError(member)) return <ApprovalRequired what="Contributions" />;
  const userId = member.id;

  const trip = await getUserTrip(userId);
  const contributions = trip
    ? await prisma.contribution.findMany({
        where: { tripId: trip.id },
        orderBy: { createdAt: "asc" },
        include: {
          users: { include: { user: { select: { name: true, username: true } } } },
        },
      })
    : [];

  const suggestions = contributions.filter((c) => c.users.length === 0);
  const claimed = contributions.filter((c) => c.users.length > 0);

  return (
    <div className="min-w-0 space-y-6">
      <PageNote pageKey="contributions" />
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">Contributions</h1>
        <p className="text-slate-600 text-sm mt-1">
          Add what you&apos;re bringing, or sign up for one of admin&apos;s suggestions.
        </p>
      </div>

      <AddContributionForm tripId={trip?.id ?? ""} userId={userId} />

      {suggestions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.15em] text-slate-600">Suggestions from admin</h2>
          <div className="space-y-3">
            {suggestions.map((item) => (
              <ContributionItem key={item.id} item={item} currentUserId={userId} />
            ))}
          </div>
        </section>
      )}

      {claimed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.15em] text-slate-600">Already claimed</h2>
          <div className="space-y-3">
            {claimed.map((item) => (
              <ContributionItem key={item.id} item={item} currentUserId={userId} />
            ))}
          </div>
        </section>
      )}

      {contributions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 sm:py-12">
          <p>No contributions yet — be the first.</p>
        </div>
      )}
    </div>
  );
}
