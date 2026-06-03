import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageNote } from "@/components/PageNote";
import { getUserTripOrActive } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function LodgingPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const trip = userId ? await getUserTripOrActive(userId) : null;
  const photos = trip
    ? await prisma.lodgingPhoto.findMany({ where: { tripId: trip.id }, orderBy: { position: "asc" } })
    : [];

  return (
    <div className="space-y-6 max-w-3xl">
      <PageNote pageKey="lodging" />
      <header>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Lodging</h1>
        <p className="text-stone-500 text-sm mt-1">Where we&apos;re staying.</p>
      </header>

      {trip?.lodging && (
        <section className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-stone-700 whitespace-pre-wrap">{trip.lodging}</p>
        </section>
      )}

      {photos.length > 0 ? (
        <section>
          <h2 className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-3">Photos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((p) => (
              <figure key={p.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption ?? "Lodging photo"} className="w-full aspect-square object-cover" />
                {p.caption && (
                  <figcaption className="px-3 py-2 text-xs text-stone-600">{p.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      ) : (
        !trip?.lodging && (
          <p className="text-stone-500 text-sm">Lodging details coming soon.</p>
        )
      )}
    </div>
  );
}
