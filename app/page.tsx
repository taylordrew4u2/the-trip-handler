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
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-serif text-xl font-medium text-stone-900">The Trip Handler</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-stone-700 hover:text-stone-900">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-20 pb-16 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-stone-500 mb-4">
          Group trips, minus the chaos
        </p>
        <h1 className="font-serif text-4xl md:text-6xl font-medium text-stone-900 leading-[1.05]">
          Plan the whole trip in one place.
        </h1>
        <p className="text-stone-600 text-lg mt-6 max-w-xl mx-auto leading-relaxed">
          The Trip Handler is for the friend who accidentally became the adult in charge of making
          the plan. Invite people, approve who comes, and sort lodging, meals, the itinerary, and
          per-person payments — without 400 group texts.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link
            href="/signup"
            className="px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-sm transition-colors"
          >
            Start a trip →
          </Link>
          <Link
            href="/login"
            className="px-5 py-3 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 rounded-lg font-medium text-sm transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="font-serif text-2xl md:text-3xl font-medium text-stone-900 text-center mb-12">
            How it works
          </h2>
          <ol className="grid gap-8 md:grid-cols-4">
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
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="font-serif text-2xl md:text-3xl font-medium text-stone-900 text-center mb-12">
          Everything a trip needs
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-stone-200 p-6">
              <h3 className="font-medium text-stone-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-stone-600 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="font-serif text-2xl md:text-3xl font-medium text-stone-900">
            Ready to make the plan?
          </h2>
          <p className="text-stone-600 mt-3">
            Create an account and start your first trip in a couple of minutes.
          </p>
          <Link
            href="/signup"
            className="inline-block mt-6 px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-sm transition-colors"
          >
            Create your account →
          </Link>
        </div>
      </section>

      <footer className="border-t border-stone-200">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-stone-500">
          The Trip Handler
        </div>
      </footer>
    </div>
  );
}
