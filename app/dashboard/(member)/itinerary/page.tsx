import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isApproved } from "@/lib/approval";
import { PageNote } from "@/components/PageNote";
import { ItineraryView } from "@/components/ItineraryView";
import { getUserTrip } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function ItineraryPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; status?: string; role?: string } | undefined;
  const userId = sessionUser?.id ?? "";
  const isAdmin = sessionUser?.role === "ADMIN";
  const canComment = isAdmin || isApproved(sessionUser?.status);

  const trip = userId ? await getUserTrip(userId) : null;
  const days = trip
    ? await prisma.day.findMany({
        where: { tripId: trip.id },
        orderBy: { dayNumber: "asc" },
      include: {
        itineraryItems: {
          orderBy: [{ pinned: "desc" }, { orderIndex: "asc" }],
          include: {
            comments: {
              orderBy: { createdAt: "asc" },
              include: { user: { select: { id: true, name: true } } },
            },
          },
        },
      },
      })
    : [];

  if (!trip) {
    return <p className="text-stone-500 text-sm">No trip found yet.</p>;
  }

  const dateRange = [
    trip.startDate &&
      new Date(trip.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    trip.endDate &&
      new Date(trip.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  ]
    .filter(Boolean)
    .join(" – ");

  return (
    <div className="space-y-8 max-w-3xl">
      <PageNote pageKey="itinerary" />
      <header>
        <h1 className="font-serif text-3xl font-medium text-stone-900">{trip.name}</h1>
        <p className="text-stone-600 text-sm mt-1">
          {[trip.destination, dateRange].filter(Boolean).join(" · ")}
        </p>
      </header>

      {!canComment && (
        <p className="text-xs uppercase tracking-[0.15em] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Read-only · comments unlock when you&apos;re approved
        </p>
      )}

      <ItineraryView
        days={days}
        currentUserId={userId}
        isAdmin={isAdmin}
        canComment={canComment}
      />

      {trip.description && (
        <section className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="text-xs uppercase tracking-[0.15em] text-stone-500">About</h2>
          <p className="text-stone-700 mt-2 whitespace-pre-wrap">{trip.description}</p>
        </section>
      )}
    </div>
  );
}
