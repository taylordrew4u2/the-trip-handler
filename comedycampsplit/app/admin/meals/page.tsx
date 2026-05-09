import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminMealsPage() {
  const users = await prisma.user.findMany({
    where: {
      role: "PARTICIPANT",
      status: { in: ["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"] },
    },
    orderBy: { name: "asc" },
    include: {
      guestForm: {
        select: {
          hasAllergies: true,
          allergiesList: true,
          allergySeverity: true,
          dietaryRestrictions: true,
          dietaryOther: true,
          willNotEat: true,
          likedFoods: true,
          snackRequests: true,
          drinkPrefs: true,
          drinkOther: true,
          communalMeals: true,
          helpCookClean: true,
          preferencesSubmittedAt: true,
        },
      },
    },
  });

  // Aggregate dietary tally for quick planning
  const dietaryCounts: Record<string, number> = {};
  const allergyCount = users.filter((u) => u.guestForm?.hasAllergies === "yes").length;
  for (const u of users) {
    for (const r of u.guestForm?.dietaryRestrictions ?? []) {
      if (r === "None") continue;
      dietaryCounts[r] = (dietaryCounts[r] ?? 0) + 1;
    }
  }
  const dietaryEntries = Object.entries(dietaryCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Meals &amp; dietary</h1>
        <p className="text-stone-500 text-sm mt-1">
          Approved guests and what they need. Use this to shop and plan meals.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="text-xs uppercase tracking-[0.15em] text-stone-500 mb-3">At a glance</h2>
        <div className="flex flex-wrap gap-2">
          <span className="text-sm px-3 py-1.5 rounded-md bg-stone-100 text-stone-800">
            {users.length} approved
          </span>
          <span className="text-sm px-3 py-1.5 rounded-md bg-amber-100 text-amber-900">
            {allergyCount} with allergies
          </span>
          {dietaryEntries.length > 0 ? (
            dietaryEntries.map(([k, v]) => (
              <span key={k} className="text-sm px-3 py-1.5 rounded-md bg-blue-50 text-blue-900">
                {k}: {v}
              </span>
            ))
          ) : (
            <span className="text-sm text-stone-500 italic">No dietary restrictions reported yet.</span>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-[0.15em] text-stone-500">Per person</h2>
        {users.length === 0 ? (
          <p className="text-stone-500 text-sm">No approved guests yet.</p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => {
              const f = u.guestForm;
              const noPrefs = !f || !f.preferencesSubmittedAt;
              const dietary = [
                ...(f?.dietaryRestrictions ?? []).filter((d) => d !== "None"),
                f?.dietaryOther,
              ].filter(Boolean) as string[];
              const drinks = [...(f?.drinkPrefs ?? []), f?.drinkOther].filter(Boolean) as string[];
              return (
                <article key={u.id} className="bg-white rounded-xl border border-stone-200 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-stone-900">
                        {u.name}
                        {u.username && <span className="text-stone-400 font-normal"> · @{u.username}</span>}
                      </h3>
                      {f?.hasAllergies === "yes" && (
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-red-100 text-red-900 font-medium">
                          ALLERGY
                          {f.allergySeverity && f.allergySeverity !== "n/a" ? ` · ${f.allergySeverity}` : ""}
                        </span>
                      )}
                    </div>
                    <Link href={`/admin/intake/${u.id}`} className="text-xs text-stone-500 hover:text-stone-900">
                      Full form →
                    </Link>
                  </div>

                  {noPrefs ? (
                    <p className="text-sm text-amber-700 mt-3">
                      Hasn&apos;t filled out preferences yet — no meal info on file.
                    </p>
                  ) : (
                    <dl className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      {f?.hasAllergies === "yes" && f.allergiesList && (
                        <div className="md:col-span-2">
                          <dt className="text-xs uppercase tracking-wide text-red-700 font-medium">Allergies</dt>
                          <dd className="text-stone-900 mt-0.5 whitespace-pre-wrap">{f.allergiesList}</dd>
                        </div>
                      )}
                      {dietary.length > 0 && (
                        <div className="md:col-span-2">
                          <dt className="text-xs uppercase tracking-wide text-stone-500">Dietary</dt>
                          <dd className="text-stone-700 mt-0.5">{dietary.join(", ")}</dd>
                        </div>
                      )}
                      {f?.willNotEat && (
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-stone-500">Won&apos;t eat</dt>
                          <dd className="text-stone-700 mt-0.5 whitespace-pre-wrap">{f.willNotEat}</dd>
                        </div>
                      )}
                      {f?.likedFoods && (
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-stone-500">Likes</dt>
                          <dd className="text-stone-700 mt-0.5 whitespace-pre-wrap">{f.likedFoods}</dd>
                        </div>
                      )}
                      {f?.snackRequests && (
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-stone-500">Snacks</dt>
                          <dd className="text-stone-700 mt-0.5 whitespace-pre-wrap">{f.snackRequests}</dd>
                        </div>
                      )}
                      {drinks.length > 0 && (
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-stone-500">Drinks</dt>
                          <dd className="text-stone-700 mt-0.5">{drinks.join(", ")}</dd>
                        </div>
                      )}
                      {f?.communalMeals && (
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-stone-500">Communal meals</dt>
                          <dd className="text-stone-700 mt-0.5">{f.communalMeals}</dd>
                        </div>
                      )}
                      {f?.helpCookClean && (
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-stone-500">Help cook/clean</dt>
                          <dd className="text-stone-700 mt-0.5">{f.helpCookClean}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
