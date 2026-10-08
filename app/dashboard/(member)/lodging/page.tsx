import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageNote } from "@/components/PageNote";
import { getUserTrip } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function LodgingPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const trip = userId ? await getUserTrip(userId) : null;
  const photos = trip
    ? await prisma.lodgingPhoto.findMany({ where: { tripId: trip.id }, orderBy: { position: "asc" } })
    : [];

  return (
    <div className="min-w-0 space-y-8 max-w-3xl">
      <PageNote pageKey="lodging" />
      <header>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">Lodging</h1>
        <p className="text-slate-600 text-sm mt-1">Where we&apos;re staying.</p>
      </header>

      {trip?.lodging && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6">
          <p className="text-slate-700 whitespace-pre-wrap break-words leading-relaxed">{trip.lodging}</p>
        </section>
      )}

      {photos.length > 0 ? (
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-slate-600 mb-3">Photos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((p) => (
              <figure key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption ?? "Lodging photo"} className="w-full aspect-square object-cover" />
                {p.caption && (
                  <figcaption className="px-3 py-2 text-xs text-slate-600">{p.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      ) : (
        !trip?.lodging && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-600 text-sm">Lodging details coming soon.</p>
        )
      )}
    </div>
  );
}
