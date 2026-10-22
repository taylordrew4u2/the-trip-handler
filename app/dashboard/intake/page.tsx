import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { IntakeForm } from "./IntakeForm";

export default async function IntakePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId || userId === "admin") redirect("/login");

  const [user, existing] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { trip: { select: { depositAmount: true, disabledSections: true } } } }),
    prisma.guestForm.findUnique({ where: { userId } }),
  ]);

  if (!user) redirect("/login");

  const isPending = user.status === "PENDING";
  const off = user.trip?.disabledSections ?? [];
  const planning = [
    "the house",
    !off.includes("meals") && "food",
    !off.includes("sleeping") && "sleeping",
    !off.includes("transport") && "van transportation",
    !off.includes("itinerary") && "group activities",
    !off.includes("social") && "social-media content",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-w-0">
      {!user.tripId && (
        <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="text-slate-600">
            Just here to organize a trip of your own?
          </span>
          <Link
            href="/dashboard/my-trips"
            className="inline-flex min-h-11 items-center font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-4 hover:decoration-indigo-600"
          >
            Host your own trip →
          </Link>
        </div>
      )}
      <div className="mb-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
          {isPending ? "Required before approval" : "Guest form"}
        </p>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">Guest Form</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          {isPending ? (
            <>
              The organizer needs this filled out before approving you. We use it to plan {planning} without
              texting everyone individually 400 times. <strong>Submit this and you&apos;ll be reviewed for approval.</strong>
            </>
          ) : (
            <>Fill this out so we can plan {planning} without texting everyone individually 400 times.</>
          )}
        </p>
      </div>
      {!user.tripId ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          This form is your application to a trip, so join one first with an invite link or join code.{" "}
          <Link href="/dashboard/start" className="font-semibold text-indigo-700 underline underline-offset-4">
            Find a trip →
          </Link>
        </div>
      ) : (
      <IntakeForm
        defaultEmail={user.email}
        defaultName={user.name}
        defaultPhone={user.phone ?? ""}
        existing={existing}
        isPending={isPending}
        deposit={user.trip?.depositAmount ?? 75}
        off={user.trip?.disabledSections ?? []}
      />
      )}
    </div>
  );
}
