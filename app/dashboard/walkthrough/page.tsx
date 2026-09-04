"use client";

import Link from "next/link";
import { useState } from "react";

type Step = {
  tag: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    tag: "The idea",
    title: "One place to run a group trip",
    body: "The Trip Handler is for the friend who accidentally became the adult in charge. It keeps the roster, lodging, meals, money, and logistics in one spot instead of fifteen group chats and a spreadsheet.",
  },
  {
    tag: "Getting in",
    title: "Create a trip, or join one",
    body: "Organizers create a trip and get a shareable invite link plus a short code. Everyone else joins by opening that link or entering the code — then applies, and the organizer approves them.",
  },
  {
    tag: "Step 1 · Intake",
    title: "Everyone fills out a guest form",
    body: "After applying, each person completes a short guest form — contact info, who they are, the basics the organizer needs. The organizer reviews it before saying yes.",
  },
  {
    tag: "Step 2 · Approval",
    title: "The organizer approves the roster",
    body: "Applicants sit as pending until approved. Once you're in, the rest of the app unlocks: the roster, sleeping arrangements, meals, contributions, and payment.",
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
    body: "The organizer sets housing, transport, and meal costs, then locks them. The app splits the total per person, adds a refundable deposit, and collects everyone's share through Stripe.",
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
    <div className="min-h-dvh bg-stone-50 flex flex-col">
      <header className="border-b border-stone-200 bg-white pt-safe">
        <div className="max-w-3xl mx-auto gutter h-14 flex items-center justify-between">
          <span className="font-serif text-base sm:text-lg font-medium text-stone-900 truncate">The Trip Handler</span>
          <Link href="/dashboard/start" className="inline-flex items-center min-h-[44px] px-1 text-sm text-stone-500 hover:text-stone-900 shrink-0">
            Skip
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center gutter py-8 md:py-10 pb-safe">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 md:p-10 min-h-[17rem] sm:min-h-[20rem] flex flex-col">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-3">{step.tag}</p>
            <h1 className="font-serif text-2xl md:text-3xl font-medium text-stone-900 leading-tight">
              {step.title}
            </h1>
            <p className="text-stone-600 mt-4 leading-relaxed flex-1">{step.body}</p>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 mt-8" aria-hidden>
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-stone-900" : "w-1.5 bg-stone-300"
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
              className="inline-flex items-center justify-center px-4 min-h-[44px] rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 disabled:opacity-0 disabled:pointer-events-none"
            >
              ← Back
            </button>

            <span className="text-xs text-stone-500 tabular-nums">
              {index + 1} / {STEPS.length}
            </span>

            {isLast ? (
              <div className="flex gap-2 ml-auto">
                <Link
                  href="/dashboard/start"
                  className="inline-flex items-center justify-center px-3 sm:px-4 min-h-[44px] rounded-lg border border-stone-300 hover:bg-stone-100 active:bg-stone-200 text-stone-700 text-sm font-medium whitespace-nowrap"
                >
                  Find a trip
                </Link>
                <Link
                  href="/dashboard/my-trips"
                  className="inline-flex items-center justify-center px-3 sm:px-4 min-h-[44px] rounded-lg bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-white text-sm font-medium whitespace-nowrap"
                >
                  Create a trip →
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(STEPS.length - 1, i + 1))}
                className="inline-flex items-center justify-center px-4 min-h-[44px] rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium"
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
