import { prisma } from "@/lib/db";
import { AdminBoardClient } from "./AdminBoardClient";

export const dynamic = "force-dynamic";

export default async function AdminBoardPage() {
  const comments = await prisma.comment.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Board</h1>
        <p className="text-stone-500 text-sm mt-1">
          Read-only feed of what members are posting on /dashboard/board. Delete anything that doesn&apos;t belong.
        </p>
      </div>
      <AdminBoardClient comments={comments} />
    </div>
  );
}
