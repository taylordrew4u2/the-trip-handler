import { prisma } from "@/lib/db";
import { RosterClientView } from "./RosterClientView";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { getUserStatus, isApproved } from "@/lib/approval";
import { PageNote } from "@/components/PageNote";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  if (!isApproved(await getUserStatus())) return <ApprovalRequired what="The roster" />;

  const [users, totalApproved, totalPaid] = await Promise.all([
    prisma.user.findMany({
      where: {
        status: { in: ["APPROVED", "CONFIRMED_PAID", "PENDING_PAYMENT"] },
        role: "PARTICIPANT",
      },
      orderBy: { name: "asc" },
      include: {
        contributions: { include: { contribution: true } },
      },
    }),
    prisma.user.count({ where: { status: { in: ["APPROVED", "CONFIRMED_PAID", "PENDING_PAYMENT"] }, role: "PARTICIPANT" } }),
    prisma.user.count({ where: { status: "CONFIRMED_PAID", role: "PARTICIPANT" } }),
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
