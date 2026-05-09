import { prisma } from "@/lib/db";
import { UsersClient } from "./UsersClient";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    where: { role: "PARTICIPANT" },
    orderBy: { createdAt: "desc" },
    include: {
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      guestForm: { select: { id: true, maxBudget: true, substanceFreeAck: true, locked: true, editRequested: true } },
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Users</h1>
        <p className="text-stone-500 text-sm mt-1">Approve, reject, or cancel applicants. Filter by status.</p>
      </div>
      <UsersClient users={users} />
    </div>
  );
}
