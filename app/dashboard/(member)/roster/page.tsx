import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RosterClientView } from "./RosterClientView";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { getUserStatus, isApproved } from "@/lib/approval";
import { PageNote } from "@/components/PageNote";
import { getUserTrip } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  if (!isApproved(await getUserStatus())) return <ApprovalRequired what="The roster" />;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const trip = userId ? await getUserTrip(userId) : null;
  const scope = trip
    ? { tripId: trip.id, role: "PARTICIPANT" as const }
    : { role: "PARTICIPANT" as const };

  const [users, totalApproved, totalPaid] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...scope,
        status: { in: ["APPROVED", "CONFIRMED_PAID", "PENDING_PAYMENT"] },
      },
      orderBy: { name: "asc" },
      include: {
        contributions: { include: { contribution: true } },
      },
    }),
    prisma.user.count({ where: { ...scope, status: { in: ["APPROVED", "CONFIRMED_PAID", "PENDING_PAYMENT"] } } }),
    prisma.user.count({ where: { ...scope, status: "CONFIRMED_PAID" } }),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageNote pageKey="roster" />
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Who&apos;s coming</h1>
        <p className="text-stone-500 text-sm mt-1">
          {totalApproved} approved · {totalPaid} confirmed &amp; paid
        </p>
      </div>
      <RosterClientView initialUsers={users} />
    </div>
  );
}
