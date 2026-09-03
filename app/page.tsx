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
    <div className="min-h-dvh bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-10 pt-safe">
        <div className="max-w-5xl mx-auto gutter h-14 md:h-16 flex items-center justify-between gap-3">
          <span className="font-serif text-lg md:text-xl font-medium text-stone-900 truncate">The Trip Handler</span>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <Link href="/login" className="inline-flex items-center min-h-[44px] px-2 text-sm font-medium text-stone-700 hover:text-stone-900">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center text-sm font-medium px-3 sm:px-4 min-h-[40px] bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto gutter pt-14 pb-12 md:pt-20 md:pb-16 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-stone-500 mb-4">
          Group trips, minus the chaos
        </p>
        <h1 className="font-serif text-[2.15rem] sm:text-5xl md:text-6xl font-medium text-stone-900 leading-[1.08] text-balance">
          Plan the whole trip in one place.
        </h1>
        <p className="text-stone-600 text-base sm:text-lg mt-5 md:mt-6 max-w-xl mx-auto leading-relaxed text-pretty">
          The Trip Handler is for the friend who accidentally became the adult in charge of making
          the plan. Invite people, approve who comes, and sort lodging, meals, the itinerary, and
          per-person payments — without 400 group texts.
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-center gap-3 mt-8">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-5 min-h-[48px] bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            Start a trip →
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-5 min-h-[48px] bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-900 border border-stone-300 rounded-lg font-medium text-sm transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto gutter py-12 md:py-16">
          <h2 className="font-serif text-2xl md:text-3xl font-medium text-stone-900 text-center mb-8 md:mb-12">
            How it works
          </h2>
          <ol className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-stone-900 text-white text-sm font-medium mb-4">
                  {i + 1}
                </div>
                <h3 className="font-medium text-stone-900 mb-1.5">{step.title}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto gutter py-12 md:py-16">
        <h2 className="font-serif text-2xl md:text-3xl font-medium text-stone-900 text-center mb-8 md:mb-12">
          Everything a trip needs
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6">
              <h3 className="font-medium text-stone-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto gutter py-12 md:py-16 text-center">
          <h2 className="font-serif text-2xl md:text-3xl font-medium text-stone-900">
            Ready to make the plan?
          </h2>
          <p className="text-stone-600 mt-3">
            Create an account and start your first trip in a couple of minutes.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center mt-6 px-5 min-h-[48px] bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            Create your account →
          </Link>
        </div>
      </section>

      <footer className="border-t border-stone-200 pb-safe">
        <div className="max-w-5xl mx-auto gutter py-8 text-center text-xs text-stone-500">
          The Trip Handler
        </div>
      </footer>
    </div>
  );
}
