import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { isApproved } from "@/lib/approval";
import { SleepingClient } from "./SleepingClient";

export const dynamic = "force-dynamic";

export default async function SleepingPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; status?: string } | undefined;
  if (!isApproved(sessionUser?.status)) return <ApprovalRequired what="Sleeping arrangements" />;
  const userId = sessionUser?.id ?? "";

  const [beds, me] = await Promise.all([
    prisma.bed.findMany({
      orderBy: [{ room: "asc" }, { createdAt: "asc" }],
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, username: true } } },
        },
      },
    }),
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { gender: true } }) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Sleeping arrangements</h1>
        <p className="text-stone-500 text-sm mt-1 leading-relaxed">
          Pick a bed below — rooms and beds are chosen ahead of time, so claim early. Doubles fit
          two; singles fit one. Female members can bump a current single occupant if needed.
        </p>
      </div>
      <SleepingClient beds={beds} userId={userId} myGender={me?.gender ?? null} />
    </div>
  );
}
