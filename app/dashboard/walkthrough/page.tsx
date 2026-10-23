"use client";

import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/Brand";

type Step = {
  tag: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    tag: "The idea",
    title: "One place to run a group trip",
    body: "Keep trip details, guests, meals, and payments together. Organizers manage the plan; guests see the information and next steps they need.",
  },
  {
    tag: "Getting in",
    title: "Create a trip, or join one",
    body: "Organizers create a trip and get a shareable invite link plus a short code. Everyone else joins by opening that link or entering the code — then applies, and the organizer approves them.",
  },
  {
    tag: "Step 1 · Intake",
    title: "Everyone fills out a guest form",
    body: "After joining through an invite, answer the guest form and submit it for review. The organizer chooses the questions and decides whether to approve your application.",
  },
  {
    tag: "Step 2 · Approval",
    title: "The organizer approves the roster",
    body: "Pending approval means the organizer is still reviewing your application. After approval, you can use the group tools that the organizer has enabled.",
  },
  {
    tag: "Step 3 · Plan",
    title: "Itinerary, lodging & sleeping",
    body: "Lay out the days, share lodging details and photos, and let people claim beds and request who they want to bunk with — no more figuring out rooms at 1am on arrival.",
  },
  {
    tag: "Step 4 · Food",
    title: "Meals, votes & a grocery list",
    body: "Suggest meals, vote on them, sign up to cook, and let the app roll everything into a grocery list so the food actually happens.",
  },
  {
    tag: "Step 5 · Money",
    title: "Pricing, locking & payment",
    body: "The organizer enters total costs and chooses how many ways to split them. Before prices are locked, your share is an estimate. After prices are locked, review your share and deposit on Payment, then choose an available payment method.",
  },
  {
    tag: "Step 6 · The extras",
    title: "Contributions, expenses & the board",
    body: "Claim what to bring, submit receipts for shared expenses, and use the board to keep the group talking. When you're done, you've actually planned a trip.",
  },
];

export default function WalkthroughPage() {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  return (
    <div className="min-h-dvh bg-[#f6f7fb] flex flex-col">
      <header className="border-b border-slate-200 bg-white pt-safe">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 gutter">
          <Link href="/" aria-label="The Trip Handler home" className="flex min-h-11 min-w-0 items-center"><Brand /></Link>
          <Link href="/dashboard/start" className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950">
            Skip
          </Link>
        </div>
      </header>

      <div className="mx-auto px-5 pt-3 text-sm"><Link href="/help" className="inline-flex min-h-11 items-center text-indigo-700 underline">Open Help &amp; FAQ</Link></div>
      <main className="flex-1 flex items-center justify-center gutter py-8 md:py-10 pb-safe">
        <div className="w-full min-w-0 max-w-2xl">
          <p className="mb-5 text-center text-sm font-medium text-slate-600">A quick tour of your trip, from the first invite to the final payment.</p>
          <div className="flex min-h-[23rem] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 md:p-10">
            <div className="mb-7 flex items-center justify-between gap-4">
              <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-sm font-semibold text-indigo-700">{String(index + 1).padStart(2, "0")}</span>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-700">{step.tag}</p>
            </div>
            <h1 className="font-serif text-3xl font-medium leading-tight tracking-tight text-slate-950 text-balance sm:text-4xl">
              {step.title}
            </h1>
            <p className="mt-5 flex-1 text-sm leading-7 text-slate-600 sm:text-base">{step.body}</p>

            {/* Progress dots */}
            <div className="mt-8 flex items-center gap-1.5" aria-hidden>
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= index ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-5">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={isFirst}
              className="inline-flex items-center justify-center px-4 min-h-[44px] rounded-xl text-sm font-medium text-slate-600 hover:text-slate-950 disabled:opacity-0 disabled:pointer-events-none"
            >
              ← Back
            </button>

            <span className="text-xs text-slate-600 tabular-nums" aria-live="polite">
              {index + 1} / {STEPS.length}
            </span>

            {isLast ? (
              <div className="flex gap-2 ml-auto">
                <Link
                  href="/dashboard/start"
                  className="inline-flex items-center justify-center px-3 sm:px-4 min-h-[44px] rounded-xl border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-sm font-medium whitespace-nowrap"
                >
                  Find a trip
                </Link>
                <Link
                  href="/dashboard/my-trips"
                  className="inline-flex items-center justify-center px-3 sm:px-4 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium whitespace-nowrap"
                >
                  Create a trip →
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(STEPS.length - 1, i + 1))}
                className="inline-flex items-center justify-center px-4 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
