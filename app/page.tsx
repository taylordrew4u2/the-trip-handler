import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const STEPS = [
  {
    title: "Create a trip",
    body: "Name it, set the dates, and you're the owner. You get a private invite link and a short join code to share — there's no public directory.",
  },
  {
    title: "Invite & approve",
    body: "People open your link or enter the code and apply. You approve or reject each one, so only the people you want end up on the trip.",
  },
  {
    title: "Plan the logistics",
    body: "Lodging, a meal poll everyone votes on, an itinerary, sleeping arrangements, a contributions board, and shared expenses — all in one place.",
  },
  {
    title: "Collect payments",
    body: "Set a per-person price across lodging, transport, and meals, then collect it through Stripe. See who's paid at a glance.",
  },
];

const FEATURES = [
  { title: "Roster & applications", body: "Review applicants, approve or reject, and see everyone who's coming." },
  { title: "Lodging", body: "Share the place, add photos, and keep the details in one spot." },
  { title: "Meal poll", body: "Propose meals and let the group vote so nobody plans dinner for 12 alone." },
  { title: "Itinerary", body: "A day-by-day plan everyone can see — arrivals, activities, departures." },
  { title: "Shared expenses", body: "Log group costs with receipts and keep the running total honest." },
  { title: "Stripe payments", body: "Per-person pricing collected securely, with payment status tracked." },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-[#f6f7fb] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 gutter">
          <Link href="/" className="flex items-center gap-3 min-w-0" aria-label="The Trip Handler home">
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-sm shadow-indigo-300">T</span>
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">The Trip Handler</span>
          </Link>
          <nav aria-label="Account" className="flex shrink-0 items-center gap-2">
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950">Sign in</Link>
            <Link href="/signup" className="inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">Get started <span aria-hidden="true" className="ml-2">↗</span></Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200/80">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-12 size-[28rem] rounded-full bg-indigo-100/70 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl gap-12 gutter py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:py-28">
            <div>
              <h1 className="max-w-2xl font-serif text-[clamp(3rem,6vw,5.6rem)] font-medium leading-[1.05] tracking-[-0.045em] text-slate-950 text-balance">
                Less planning. <span className="text-indigo-600">More trip.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
                The Trip Handler is for the friend who accidentally became the adult in charge of making the plan. Invite people, approve who comes, and sort lodging, meals, the itinerary, and per-person payments — without 400 group texts.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-600/15 transition-all hover:-translate-y-0.5 hover:bg-indigo-700">Start a trip <span aria-hidden="true" className="ml-2">→</span></Link>
                <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50">Sign in</Link>
              </div>
              <p className="mt-6 text-sm text-slate-500">Private invites. One shared plan. Everyone in the loop.</p>
            </div>
            <div className="relative mx-auto w-full max-w-md lg:mx-0" aria-label="Features included in a trip">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-24px_rgba(30,41,59,0.22)] sm:p-7">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Your trip, handled.</h2>
                    <p className="mt-1 text-sm text-slate-500">One place for the whole group</p>
                  </div>
                  <span aria-hidden="true" className="grid size-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">✦</span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    ["01", "People & invites", "Approve your crew"],
                    ["02", "Sleep & stay", "Sort rooms and beds"],
                    ["03", "Meals & plans", "Vote and coordinate"],
                    ["04", "Shared costs", "Keep payments clear"],
                  ].map(([number, title, detail]) => (
                    <div key={number} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                      <span className="text-xs font-semibold text-indigo-600">{number}</span>
                      <h3 className="mt-5 text-sm font-semibold text-slate-900">{title}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-indigo-600 px-4 py-4 text-white">
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15">✓</span>
                  <p className="text-sm font-medium">From the first invite to the final payment.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl gutter py-16 sm:py-24">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">From group chat to getaway.</h2>
            <p className="mt-3 text-base leading-7 text-slate-600">Four steps to organize the entire trip.</p>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-7 text-base font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl gutter py-16 sm:py-24">
            <div className="max-w-2xl">
              <h2 className="font-serif text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">Everything a trip needs.</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">The tools your group needs, without the spreadsheets.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-slate-200 bg-[#f9faff] p-6 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50">
                  <span aria-hidden="true" className="mb-6 block h-1 w-9 rounded-full bg-indigo-500" />
                  <h3 className="text-base font-semibold text-slate-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl gutter py-16 sm:py-24">
          <div className="flex flex-col gap-6 rounded-[2rem] bg-slate-950 p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">Ready to make the plan?</h2>
              <p className="mt-3 text-base leading-7 text-slate-300">Create an account and start your first trip in a couple of minutes.</p>
            </div>
            <Link href="/signup" className="inline-flex min-h-12 shrink-0 items-center justify-center self-start rounded-xl bg-white px-6 text-sm font-semibold text-slate-950 transition-colors hover:bg-indigo-100">Create your account <span aria-hidden="true" className="ml-2">→</span></Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 pb-safe">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 gutter py-8 text-xs text-slate-500 sm:flex-row">
          <span>The Trip Handler</span><span>Less planning. More trip.</span>
        </div>
      </footer>
    </div>
  );
}
