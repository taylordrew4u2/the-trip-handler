import { getServerSession } from "next-auth";
import { requireSection } from "@/lib/sections";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RosterClientView } from "./RosterClientView";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { getUserStatus, isApproved } from "@/lib/approval";
import { PageNote } from "@/components/PageNote";
import { getUserTrip } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  await requireSection("roster");
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
      // Explicit select: other members' rows must not carry private fields
      // (password hash, admin notes, price adjustments) to the browser.
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        contributions: { select: { contribution: { select: { title: true, category: true } } } },
      },
    }),
    prisma.user.count({ where: { ...scope, status: { in: ["APPROVED", "CONFIRMED_PAID", "PENDING_PAYMENT"] } } }),
    prisma.user.count({ where: { ...scope, status: "CONFIRMED_PAID" } }),
  ]);

  return (
    <div className="min-w-0 space-y-8 max-w-3xl">
      <PageNote pageKey="roster" />
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">Who&apos;s coming</h1>
        <p className="text-slate-600 text-sm mt-1">
          {totalApproved} approved · {totalPaid} confirmed &amp; paid
        </p>
      </div>
      <RosterClientView initialUsers={users} />
    </div>
  );
}
