import { prisma } from "@/lib/db";
import { AdminContributionsClient } from "./AdminContributionsClient";

export default async function AdminContributionsPage() {
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Contributions</h1>
        <p className="text-stone-500 text-sm mt-1">
          Suggestions you add appear under &ldquo;Suggestions from admin&rdquo; on the member side until someone signs up.
        </p>
      </div>
      <AdminContributionsClient contributions={contributions} tripId={trip?.id ?? ""} />
    </div>
  );
}
