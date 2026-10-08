import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignOutLink } from "@/components/SignOutLink";
import { FindTripForm } from "./FindTripForm";
import { Brand } from "@/components/Brand";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const firstName =
    userId && userId !== "admin"
      ? (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name
          ?.split(" ")[0]
      : null;

  return (
    <div className="min-h-dvh bg-[#f6f7fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white pt-safe">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 gutter">
          <Link href="/" aria-label="The Trip Handler home" className="flex min-h-11 min-w-0 items-center"><Brand /></Link>
          <SignOutLink />
        </div>
      </header>

      <main className="mx-auto max-w-4xl gutter py-10 md:py-16">
        <div className="mb-8 md:mb-10">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
            {firstName ? `Welcome, ${firstName}` : "Welcome"}
          </p>
          <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight text-slate-950 text-balance md:text-5xl">
            What would you like to do?
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            You&apos;re not on a trip yet. Start one, learn how this works, or join a trip you were
            told about. If a friend sent you an invite link, just open it.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Create a trip */}
          <Link
            href="/dashboard/my-trips"
            className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md active:border-indigo-600 sm:p-7"
          >
            <span className="mb-6 grid size-12 place-items-center rounded-2xl bg-indigo-50 text-xl text-indigo-700" aria-hidden>
              ✦
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Create a trip</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                You&apos;re the one making the plan. Name a trip, get a shareable link and code, and
                approve who comes.
              </p>
              <p className="mt-6 text-sm font-semibold text-indigo-700 group-hover:underline">
                Start a trip →
              </p>
            </div>
          </Link>

          {/* Walkthrough */}
          <Link
            href="/dashboard/walkthrough"
            className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md active:border-indigo-600 sm:p-7"
          >
            <span className="mb-6 grid size-12 place-items-center rounded-2xl bg-indigo-50 text-xl text-indigo-700" aria-hidden>
              ☞
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Take the walkthrough</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                New here? A quick tour of everything the app handles — intake, approvals, lodging,
                meals, pricing, and payment.
              </p>
              <p className="mt-6 text-sm font-semibold text-indigo-700 group-hover:underline">
                See how it works →
              </p>
            </div>
          </Link>

          {/* Find a trip by code */}
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2 sm:p-7">
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-700" aria-hidden>
                ⌕
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">Find a trip by code</h2>
                <p className="mb-5 mt-2 text-sm leading-6 text-slate-600">
                  Got a code from the trip&apos;s organizer? Enter it to pull up the trip and apply.
                </p>
                <FindTripForm />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
