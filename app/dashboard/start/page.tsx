import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignOutLink } from "@/components/SignOutLink";
import { FindTripForm } from "./FindTripForm";

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
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-white pt-safe">
        <div className="max-w-3xl mx-auto gutter h-14 flex items-center justify-between gap-3">
          <span className="font-serif text-base sm:text-lg font-medium text-stone-900 truncate">The Trip Handler</span>
          <SignOutLink />
        </div>
      </header>

      <main className="max-w-2xl mx-auto gutter py-8 md:py-12">
        <div className="mb-8 md:mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">
            {firstName ? `Welcome, ${firstName}` : "Welcome"}
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-medium text-stone-900 leading-tight">
            What would you like to do?
          </h1>
          <p className="text-stone-500 text-sm mt-3">
            You&apos;re not on a trip yet. Start one, learn how this works, or join a trip you were
            told about. If a friend sent you an invite link, just open it.
          </p>
        </div>

        <div className="space-y-4">
          {/* Create a trip */}
          <Link
            href="/dashboard/my-trips"
            className="group flex items-start gap-3 sm:gap-4 bg-white rounded-xl border border-stone-200 p-5 sm:p-6 hover:border-stone-900 active:border-stone-900 transition-colors"
          >
            <span className="text-2xl" aria-hidden>
              ✦
            </span>
            <div className="min-w-0">
              <h2 className="font-medium text-stone-900">Create a trip</h2>
              <p className="text-sm text-stone-500 mt-1">
                You&apos;re the one making the plan. Name a trip, get a shareable link and code, and
                approve who comes.
              </p>
              <p className="text-sm text-stone-900 mt-2 font-medium group-hover:underline">
                Start a trip →
              </p>
            </div>
          </Link>

          {/* Walkthrough */}
          <Link
            href="/dashboard/walkthrough"
            className="group flex items-start gap-3 sm:gap-4 bg-white rounded-xl border border-stone-200 p-5 sm:p-6 hover:border-stone-900 active:border-stone-900 transition-colors"
          >
            <span className="text-2xl" aria-hidden>
              ☞
            </span>
            <div className="min-w-0">
              <h2 className="font-medium text-stone-900">Take the walkthrough</h2>
              <p className="text-sm text-stone-500 mt-1">
                New here? A quick tour of everything the app handles — intake, approvals, lodging,
                meals, pricing, and payment.
              </p>
              <p className="text-sm text-stone-900 mt-2 font-medium group-hover:underline">
                See how it works →
              </p>
            </div>
          </Link>

          {/* Find a trip by code */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="text-2xl" aria-hidden>
                ⌕
              </span>
              <div className="flex-1">
                <h2 className="font-medium text-stone-900">Find a trip by code</h2>
                <p className="text-sm text-stone-500 mt-1 mb-4">
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
