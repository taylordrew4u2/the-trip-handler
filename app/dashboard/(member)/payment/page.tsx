import { prisma } from "@/lib/db";
import { requireSection } from "@/lib/sections";
import { PaymentClient, type PaymentView } from "./PaymentClient";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { isAuthzError, requireApprovedMember } from "@/lib/authz";
import { PageNote } from "@/components/PageNote";
import { getMemberBill } from "@/lib/bill";
import { reconcileCheckout } from "@/app/actions/payments";
import { hasFeature, hasMeals, toCents } from "@/lib/pricing";

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  await requireSection("payment");
  // Approval is read from the database, not the sign-in-time JWT, so a
  // member removed from the trip loses access on their next request.
  const member = await requireApprovedMember();
  if (isAuthzError(member)) return <ApprovalRequired what="Payment" />;
  const userId = member.id;

  // Back from Stripe: record the payment now rather than waiting on the webhook.
  const { session_id: sessionId } = await searchParams;
  if (sessionId) await reconcileCheckout(sessionId);

  const [trip, user, payments, bill] = await Promise.all([
    prisma.trip.findUnique({ where: { id: member.tripId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { status: true } }),
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, amount: true, method: true, status: true, receiptUrl: true, createdAt: true },
    }),
    getMemberBill(userId),
  ]);

  if (!trip || !bill) {
    return (
      <div className="min-w-0 space-y-8 max-w-2xl">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">Payment</h1>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-slate-600 text-sm">No trip set up yet.</div>
      </div>
    );
  }

  // Build exactly what this member is allowed to see. Anything the owner hid
  // is folded into "Your trip share" here on the server, so the hidden number
  // never reaches the browser.
  const showBed = trip.showBedPrices && bill.bedAdjustment !== 0;
  const showPersonal = trip.showPersonalAdjustment && bill.personalAdjustment !== 0;
  const shownShare = toCents(
    bill.share - (showBed ? bill.bedAdjustment : 0) - (showPersonal ? bill.personalAdjustment : 0),
  );

  const view: PaymentView = {
    tripName: trip.name,
    costShareDivisor: trip.costShareDivisor,
    isLocked: trip.isLocked,
    isPaid: user?.status === "CONFIRMED_PAID",
    lineItems: trip.showLineItems
      ? [
          { key: "housing", label: "Housing", total: trip.housingPrice, locked: trip.housingLocked },
          ...(hasFeature(trip, "transport")
            ? [{ key: "transport", label: "Transport", total: trip.transportPrice, locked: trip.transportLocked }]
            : []),
          ...(hasMeals(trip)
            ? [{ key: "meals", label: "Meals", total: trip.mealsPrice, locked: trip.mealsLocked }]
            : []),
        ]
      : null,
    share: shownShare,
    bed: showBed ? { label: bill.bedLabel ?? "Your bed", adjustment: bill.bedAdjustment } : null,
    personalAdjustment: showPersonal ? bill.personalAdjustment : null,
    deposit: bill.deposit,
    total: bill.total,
    paid: bill.paid,
    remaining: bill.remaining,
    venmoHandle: trip.venmoHandle,
    cashAppHandle: trip.cashAppHandle,
    cardEnabled: Boolean(process.env.STRIPE_SECRET_KEY),
    payments: payments.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
  };

  return (
    <div className="min-w-0 space-y-8 max-w-2xl">
      <PageNote pageKey="payment" />
      <h1 className="font-serif text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">Payment</h1>
      <PaymentClient view={view} />
    </div>
  );
}
