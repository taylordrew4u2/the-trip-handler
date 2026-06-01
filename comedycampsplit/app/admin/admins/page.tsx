import { prisma } from "@/lib/db";
import { AdminsClient } from "./AdminsClient";

export default async function AdminAdminsPage() {
  const [pending, admins] = await Promise.all([
    prisma.user.findMany({
      where: { adminRequest: "PENDING", role: "PARTICIPANT" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, createdAt: true },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Admins</h1>
        <p className="text-stone-500 text-sm mt-1">
          Approve admin access requests and manage who has admin rights.
        </p>
      </div>
      <AdminsClient pending={pending} admins={admins} />
    </div>
  );
}
