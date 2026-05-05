import { prisma } from "@/lib/db";
import { UsersClient } from "./UsersClient";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    where: { role: "PARTICIPANT" },
    orderBy: { createdAt: "desc" },
    include: {
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">👥 User Management</h1>
      <UsersClient users={users} />
    </div>
  );
}
