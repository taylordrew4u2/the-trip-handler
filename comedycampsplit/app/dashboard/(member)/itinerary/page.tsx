import { prisma } from "@/lib/db";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { getUserStatus, isApproved } from "@/lib/approval";

export const dynamic = "force-dynamic";

export default async function ItineraryPage() {
  if (!isApproved(await getUserStatus())) return <ApprovalRequired what="The itinerary" />;

  const [trip, days] = await Promise.all([
    prisma.trip.findFirst(),
    prisma.day.findMany({ orderBy: { dayNumber: "asc" } }),
  ]);

  if (!trip) {
    return <p className="text-stone-500 text-sm">No trip found yet.</p>;
  }

  const dateRange = [
    trip.startDate && new Date(trip.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    trip.endDate && new Date(trip.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  ]
    .filter(Boolean)
    .join(" – ");

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <h1 className="font-serif text-3xl font-medium text-stone-900">{trip.name}</h1>
        <p className="text-stone-600 text-sm mt-1">
          {[trip.destination, dateRange].filter(Boolean).join(" · ")}
        </p>
      </header>

      {days.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-stone-500">Schedule</h2>
          <div className="space-y-4">
            {days.map((d) => (
              <article key={d.id} className="bg-white rounded-xl border border-stone-200 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-stone-500">
                    Day {d.dayNumber}
                    {d.date && ` · ${new Date(d.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`}
                  </p>
                  <h3 className="font-serif text-xl font-medium text-stone-900 mt-1">
                    {d.title || `Day ${d.dayNumber}`}
                  </h3>
                </div>
                {d.schedule && (
                  <pre className="mt-3 text-sm text-stone-700 whitespace-pre-wrap font-mono bg-stone-50 rounded-md p-3">
                    {d.schedule}
                  </pre>
                )}
                {(d.breakfast || d.lunch || d.dinner) && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {d.breakfast && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-stone-500">Breakfast</p>
                        <p className="text-stone-700 mt-0.5 whitespace-pre-wrap">{d.breakfast}</p>
                      </div>
                    )}
                    {d.lunch && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-stone-500">Lunch</p>
                        <p className="text-stone-700 mt-0.5 whitespace-pre-wrap">{d.lunch}</p>
                      </div>
                    )}
                    {d.dinner && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-stone-500">Dinner</p>
                        <p className="text-stone-700 mt-0.5 whitespace-pre-wrap">{d.dinner}</p>
                      </div>
                    )}
                  </div>
                )}
                {d.notes && <p className="mt-3 text-sm text-stone-600 italic">{d.notes}</p>}
              </article>
            ))}
          </div>
        </section>
      ) : (
        trip.itinerary && (
          <section className="bg-white rounded-xl border border-stone-200 p-5">
            <h2 className="text-xs uppercase tracking-[0.15em] text-stone-500">Schedule (overview)</h2>
            <p className="text-stone-700 mt-2 whitespace-pre-wrap">{trip.itinerary}</p>
          </section>
        )
      )}

      {trip.description && (
        <section className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="text-xs uppercase tracking-[0.15em] text-stone-500">About</h2>
          <p className="text-stone-700 mt-2 whitespace-pre-wrap">{trip.description}</p>
        </section>
      )}

      {days.length === 0 && !trip.itinerary && !trip.description && (
        <p className="text-stone-500 text-sm">Itinerary details coming soon.</p>
      )}
    </div>
  );
}
