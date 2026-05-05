import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ContributionItem } from "@/components/ContributionItem";
import { addContribution } from "@/app/actions/contributions";

export default async function ContributionsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id ?? "";

  const [trip, contributions] = await Promise.all([
    prisma.trip.findFirst(),
    prisma.contribution.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        users: { include: { user: { select: { name: true, username: true } } } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">🎭 Contributions</h1>
      <p className="text-gray-500 text-sm">Sign up for things you want to bring or help with!</p>

      {contributions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🎪</div>
          <p>No contribution items yet.</p>
          <p className="text-sm mt-2">The admin will add items to sign up for!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contributions.map((item) => (
            <ContributionItem key={item.id} item={item} currentUserId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}
