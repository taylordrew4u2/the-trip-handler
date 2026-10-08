import { prisma } from "@/lib/db";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { isAuthzError, requireApprovedMember } from "@/lib/authz";
import { BoardClient } from "./BoardClient";
import { pickComposerCopy } from "./composerCopy";
import { PageNote } from "@/components/PageNote";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  // The same guard the write path uses, so approval is read from the database
  // rather than from a sign-in-time JWT.
  const member = await requireApprovedMember();
  if (isAuthzError(member)) return <ApprovalRequired what="The comment board" />;
  const userId = member.id;

  const comments = await prisma.comment.findMany({
    // Scoped to this member's trip. Without the filter, every approved member
    // of every trip saw one shared stream.
    where: { tripId: member.tripId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, username: true, avatarUrl: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
  });

  return (
    <div className="min-w-0 space-y-8 max-w-2xl">
      <PageNote pageKey="board" />
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">The Board</h1>
        <p className="text-slate-600 text-sm mt-1">
          Updates, questions, schedule chaos, anything.
        </p>
      </div>
      <BoardClient comments={comments} currentUserId={userId} {...pickComposerCopy()} />
    </div>
  );
}
