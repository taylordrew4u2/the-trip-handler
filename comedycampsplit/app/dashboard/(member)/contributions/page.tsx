import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ContributionItem } from "@/components/ContributionItem";
import { AddContributionForm } from "@/components/AddContributionForm";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { isApproved } from "@/lib/approval";
import { PageNote } from "@/components/PageNote";
import { getUserTripOrActive } from "@/lib/trip";

export default async function ContributionsPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; status?: string } | undefined;
  if (!isApproved(sessionUser?.status)) return <ApprovalRequired what="Contributions" />;
  const userId = sessionUser?.id ?? "";

  const trip = await getUserTripOrActive(userId);
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
    <div className="space-y-6">
      <PageNote pageKey="contributions" />
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Contributions</h1>
        <p className="text-stone-500 text-sm mt-1">
          Add what you&apos;re bringing, or sign up for one of admin&apos;s suggestions.
        </p>
      </div>

      <AddContributionForm tripId={trip?.id ?? ""} userId={userId} />

      {suggestions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.15em] text-stone-500">Suggestions from admin</h2>
          <div className="space-y-3">
            {suggestions.map((item) => (
              <ContributionItem key={item.id} item={item} currentUserId={userId} />
            ))}
          </div>
        </section>
      )}

      {claimed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-[0.15em] text-stone-500">Already claimed</h2>
          <div className="space-y-3">
            {claimed.map((item) => (
              <ContributionItem key={item.id} item={item} currentUserId={userId} />
            ))}
          </div>
        </section>
      )}

      {contributions.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          <p>No contributions yet — be the first.</p>
        </div>
      )}
    </div>
  );
}
