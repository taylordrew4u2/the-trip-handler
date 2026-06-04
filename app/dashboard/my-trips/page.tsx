import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { MyTripsClient } from "./MyTripsClient";

export const dynamic = "force-dynamic";

export default async function MyTripsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const trips = await prisma.trip.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      users: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, status: true },
      },
    },
  });

  const data = trips.map((t) => ({
    id: t.id,
    name: t.name,
    inviteToken: t.inviteToken,
    joinCode: t.joinCode,
    isApplicationOpen: t.isApplicationOpen,
    applicants: t.users,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">My trips</h1>
        <p className="text-stone-500 text-sm mt-1">
          Create a trip, share its invite link or join code, and approve who comes.
        </p>
      </div>
      <MyTripsClient trips={data} />
    </div>
  );
}
