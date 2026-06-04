import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { isApproved } from "@/lib/approval";
import { BoardClient } from "./BoardClient";
import { PageNote } from "@/components/PageNote";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; status?: string } | undefined;
  if (!isApproved(sessionUser?.status)) return <ApprovalRequired what="The comment board" />;
  const userId = sessionUser?.id ?? "";

  const comments = await prisma.comment.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <PageNote pageKey="board" />
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">The Board</h1>
        <p className="text-stone-500 text-sm mt-1">
          Hot takes, half-formed jokes, schedule chaos, anything.
        </p>
      </div>
      <BoardClient comments={comments} currentUserId={userId} />
    </div>
  );
}
