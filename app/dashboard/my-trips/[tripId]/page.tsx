import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { TripEditForm } from "./TripEditForm";
import { RosterSettingsPanel } from "./RosterSettingsPanel";
import { PricingPanel } from "./PricingPanel";
import { ContributionsPanel } from "./ContributionsPanel";
import { ExpensesPanel } from "./ExpensesPanel";
import { BedsPanel } from "./BedsPanel";
import { PaymentSettingsPanel } from "./PaymentSettingsPanel";
import { SectionsPanel } from "./SectionsPanel";
import { JoinAsGuestButton } from "./JoinAsGuestButton";
import { InvitePanel } from "./InvitePanel";
import { LodgingPhotosPanel } from "./LodgingPhotosPanel";
import { MemberPaymentsPanel, type MemberPaymentRow } from "./MemberPaymentsPanel";
import { computeBill } from "@/lib/bill";
import { hasFeature, hasMeals } from "@/lib/pricing";

export const dynamic = "force-dynamic";

function isoDate(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function ManageTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ownerId: userId },
  });
  if (!trip) redirect("/dashboard/my-trips");
  // Trips from before invite links existed get one the first time the owner looks.
  const inviteToken = trip.inviteToken ?? randomBytes(12).toString("hex");
  if (!trip.inviteToken) await prisma.trip.update({ where: { id: trip.id }, data: { inviteToken } });
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  const origin = `${h.get("x-forwarded-proto") ?? (local ? "http" : "https")}://${host}`;
  const waitingForApproval = await prisma.user.count({ where: { tripId: trip.id, status: "PENDING", guestForm: { isNot: null } } });

  // An owner who also joined their own trip can flip to what guests see.
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { tripId: true, status: true } });
  const ownerIsGuest = me?.tripId === trip.id && me.status !== "CANCELLED";

  const lodgingPhotos = await prisma.lodgingPhoto.findMany({
    where: { tripId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, url: true, caption: true },
  });

  const [contributions, expenses, beds, members] = await Promise.all([
    prisma.contribution.findMany({
      where: { tripId },
      orderBy: { createdAt: "desc" },
      include: { users: { include: { user: { select: { name: true } } } } },
    }),
    prisma.expense.findMany({
      where: { tripId },
      orderBy: { createdAt: "desc" },
      include: { submitter: { select: { name: true } } },
    }),
    prisma.bed.findMany({
      where: { tripId },
      orderBy: [{ room: "asc" }, { label: "asc" }],
      include: { assignments: { include: { user: { select: { name: true } } } } },
    }),
    // Owner-only: every member's private price and payment trail.
    prisma.user.findMany({
      where: { tripId, status: { in: ["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"] } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        priceAdjustment: true,
        priceAdjustmentNote: true,
        bedAssignment: { select: { bed: { select: { label: true, priceAdjustment: true } } } },
        payments: {
          orderBy: { createdAt: "desc" },
          select: { id: true, amount: true, method: true, status: true, receiptUrl: true, note: true, createdAt: true },
        },
      },
    }),
  ]);

  const memberData: MemberPaymentRow[] = members.map((m) => {
    const bed = m.bedAssignment?.bed ?? null;
    const bill = computeBill(trip, {
      priceAdjustment: m.priceAdjustment,
      bed,
      completedPayments: m.payments.filter((p) => p.status === "COMPLETED").map((p) => p.amount),
    });
    return {
      id: m.id,
      name: m.name,
      status: m.status,
      bedLabel: bed?.label ?? null,
      bedAdjustment: bill.bedAdjustment,
      priceAdjustment: m.priceAdjustment,
      priceAdjustmentNote: m.priceAdjustmentNote,
      share: bill.share,
      total: bill.total,
      paid: bill.paid,
      remaining: bill.remaining,
      payments: m.payments.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    };
  });

  const contributionData = contributions.map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    claimedBy: c.users.map((u) => u.user.name),
  }));

  const expenseData = expenses.map((e) => ({
    id: e.id,
    title: e.title,
    amount: e.amount,
    category: e.category,
    approved: e.approved,
    submitter: e.submitter?.name ?? null,
    receiptUrl: e.receiptUrl,
  }));

  const bedData = beds.map((b) => ({
    id: b.id,
    label: b.label,
    room: b.room,
    type: b.type,
    womenOnly: b.womenOnly,
    priceAdjustment: b.priceAdjustment,
    occupants: b.assignments.map((a) => a.user.name),
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/dashboard/my-trips"
            className="inline-flex items-center min-h-[44px] -ml-1 px-1 text-sm font-medium text-slate-600 hover:text-teal-800"
          >
            ← My trips
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-slate-950 break-words">
            {trip.name}
          </h1>
          <p className="text-slate-600 text-sm leading-6 mt-2">Edit the details people see on your invite page.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!ownerIsGuest && <JoinAsGuestButton tripId={trip.id} />}
          {ownerIsGuest && (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Switch to guest view →
            </Link>
          )}
          {hasMeals(trip) && (
            <Link
              href={`/dashboard/my-trips/${trip.id}/meals`}
              className="inline-flex items-center justify-center min-h-[44px] rounded-xl border border-teal-100 bg-teal-50 px-4 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-100"
            >
              Manage meal poll →
            </Link>
          )}
        </div>
      </div>
      <InvitePanel
        origin={origin}
        tripId={trip.id}
        tripName={trip.name}
        inviteToken={inviteToken}
        joinCode={trip.joinCode}
        isApplicationOpen={trip.isApplicationOpen}
        waiting={waitingForApproval}
      />
      <TripEditForm
        tripId={trip.id}
        initial={{
          name: trip.name,
          destination: trip.destination ?? "",
          startDate: isoDate(trip.startDate),
          endDate: isoDate(trip.endDate),
          description: trip.description ?? "",
          itinerary: trip.itinerary ?? "",
          lodging: trip.lodging ?? "",
          meals: trip.meals ?? "",
        }}
      />
      <SectionsPanel tripId={trip.id} disabled={trip.disabledSections} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-serif text-2xl font-medium text-slate-950">Guest form questions</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Choose what applicants answer before you approve them. Edit questions, add instructions, and mark answers as required or optional.</p>
        <Link href={`/dashboard/my-trips/${trip.id}/intake`} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white">Edit intake questions</Link>
      </section>
      <RosterSettingsPanel tripId={trip.id} capacity={trip.rosterCapacity} />
      <PricingPanel
        tripId={trip.id}
        pricing={{
          costShareDivisor: trip.costShareDivisor,
          housingPrice: trip.housingPrice,
          housingLocked: trip.housingLocked,
          transportPrice: trip.transportPrice,
          transportLocked: trip.transportLocked,
          mealsPrice: trip.mealsPrice,
          mealsLocked: trip.mealsLocked,
          isLocked: trip.isLocked,
          finalPrice: trip.finalPrice,
          depositAmount: trip.depositAmount,
          hasMeals: hasMeals(trip),
          hasTransport: hasFeature(trip, "transport"),
        }}
      />
      <PaymentSettingsPanel
        tripId={trip.id}
        settings={{
          depositAmount: trip.depositAmount,
          venmoHandle: trip.venmoHandle,
          cashAppHandle: trip.cashAppHandle,
          showLineItems: trip.showLineItems,
          showBedPrices: trip.showBedPrices,
          showPersonalAdjustment: trip.showPersonalAdjustment,
        }}
      />
      <LodgingPhotosPanel tripId={trip.id} photos={lodgingPhotos} />
      <BedsPanel tripId={trip.id} beds={bedData} />
      <MemberPaymentsPanel members={memberData} />
      <ContributionsPanel tripId={trip.id} items={contributionData} />
      <ExpensesPanel expenses={expenseData} totalExpenses={trip.totalExpenses} />
    </div>
  );
}
