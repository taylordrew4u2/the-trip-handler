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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-slate-950">My trips</h1>
          <p className="text-slate-600 text-sm leading-6 mt-2 max-w-xl">
            Create a trip, share its invite link or join code, and approve who comes.
          </p>
        </div>
        <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 text-sm font-medium text-indigo-700">
          <span className="font-semibold">{trips.length}</span> trip{trips.length === 1 ? "" : "s"} created
        </span>
      </div>
      <MyTripsClient trips={data} />
    </div>
  );
}
