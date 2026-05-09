import { prisma } from "@/lib/db";
import { AdminSleepingClient } from "./AdminSleepingClient";
import { ensureSleepingSetup } from "@/app/actions/sleeping";

export const dynamic = "force-dynamic";

export default async function AdminSleepingPage() {
  await ensureSleepingSetup();

  const [trip, beds] = await Promise.all([
    prisma.trip.findFirst(),
    prisma.bed.findMany({
      orderBy: [{ room: "asc" }, { createdAt: "asc" }],
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, username: true } } },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Sleeping arrangements</h1>
        <p className="text-stone-500 text-sm mt-1">
          Add beds and let approved members claim slots. Double beds hold two; singles are women-only by default.
        </p>
      </div>
      <AdminSleepingClient tripId={trip?.id ?? ""} beds={beds} />
    </div>
  );
}
