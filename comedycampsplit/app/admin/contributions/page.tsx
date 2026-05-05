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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">🎭 Contributions</h1>
      <AdminContributionsClient contributions={contributions} tripId={trip?.id ?? ""} />
    </div>
  );
}
