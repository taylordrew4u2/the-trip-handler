import { prisma } from "@/lib/db";
import { RosterClientView } from "./RosterClientView";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 Who's Coming</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalApproved} Approved • {totalPaid} Confirmed & Paid
          </p>
        </div>
      </div>
      <RosterClientView initialUsers={users} />
    </div>
  );
}
