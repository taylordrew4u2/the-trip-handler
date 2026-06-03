import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { isApproved } from "@/lib/approval";
import { SleepingClient } from "./SleepingClient";
import { SignOutButton } from "@/components/SignOutButton";
import { ensureSleepingSetup } from "@/app/actions/sleeping";
import { PageNote } from "@/components/PageNote";
import { getUserTripOrActive } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function SleepingPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; status?: string } | undefined;
  if (!isApproved(sessionUser?.status)) return <ApprovalRequired what="Sleeping arrangements" />;
  const userId = sessionUser?.id ?? "";

  await ensureSleepingSetup();

  const trip = await getUserTripOrActive(userId);

  const [beds, me, incomingRequests, outgoingRequests] = await Promise.all([
    prisma.bed.findMany({
      where: trip ? { tripId: trip.id } : { tripId: "__none__" },
      orderBy: [{ room: "asc" }, { createdAt: "asc" }],
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                sleepTags: true,
                sleepNote: true,
              },
            },
          },
        },
      },
    }),
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { gender: true } })
      : Promise.resolve(null),
    userId
      ? prisma.bedmateRequest.findMany({
          where: { toUserId: userId, status: "PENDING" },
          include: {
            fromUser: {
              select: { id: true, name: true, username: true, sleepTags: true, sleepNote: true },
            },
            bed: { select: { id: true, label: true, room: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    userId
      ? prisma.bedmateRequest.findMany({
          where: { fromUserId: userId, status: "PENDING" },
          include: {
            toUser: { select: { id: true, name: true, username: true } },
            bed: { select: { id: true, label: true, room: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageNote pageKey="sleeping" />
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Sleeping arrangements</h1>
        <p className="text-stone-500 text-sm mt-1 leading-relaxed">
          Claim a bed below. Doubles fit two — empty doubles can be claimed directly; if someone&apos;s
          already there, send them a request to share. Female members can bump a single occupant.
        </p>
      </div>
      <SleepingClient
        beds={beds}
        userId={userId}
        myGender={me?.gender ?? null}
        incomingRequests={incomingRequests}
        outgoingRequests={outgoingRequests}
      />

      <div className="bg-white border border-stone-200 rounded-xl p-5 flex items-center justify-between">
        <p className="text-sm text-stone-600">Done picking? You can sign out.</p>
        <SignOutButton />
      </div>
    </div>
  );
}
