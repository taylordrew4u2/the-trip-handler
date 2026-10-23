import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getMemberBill } from "@/lib/bill";

/** Statuses that may become CONFIRMED_PAID. Pending, rejected or withdrawn people never do. */
const PAYABLE = new Set(["APPROVED", "PENDING_PAYMENT"]);

/**
 * Record a Stripe Checkout Session's outcome. Called from the webhook and when
 * the member lands back on the payment page, so a late or missing webhook
 * can't leave a paid member looking unpaid. Safe to call more than once.
 *
 * The amount recorded is what Stripe actually collected, and the member is
 * only marked paid when their bill — recomputed now — is fully covered.
 */
export async function settleCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) return;

  if (session.status === "expired") {
    await prisma.payment.updateMany({
      where: { stripeSessionId: session.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    return;
  }
  if (session.payment_status !== "paid") return;

  const amount = (session.amount_total ?? 0) / 100;
  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  await prisma.payment.upsert({
    where: { stripeSessionId: session.id },
    create: {
      userId,
      amount,
      method: "STRIPE",
      status: "COMPLETED",
      stripeSessionId: session.id,
      stripePaymentId: paymentIntent,
    },
    // Never resurrect a refunded payment on a replayed event.
    update: { amount, stripePaymentId: paymentIntent, status: "COMPLETED" },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!user || !PAYABLE.has(user.status)) return;
  const bill = await getMemberBill(userId);
  if (bill && bill.remaining <= 0) {
    await prisma.user.update({ where: { id: userId }, data: { status: "CONFIRMED_PAID" } });
  }
}

/** A refund issued from the Stripe dashboard: mark the payment refunded. */
export async function settleRefund(charge: Stripe.Charge): Promise<void> {
  const paymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntent || !charge.refunded) return;
  const payments = await prisma.payment.findMany({
    where: { stripePaymentId: paymentIntent, status: "COMPLETED" },
    select: { id: true, userId: true },
  });
  for (const p of payments) {
    await prisma.payment.update({ where: { id: p.id }, data: { status: "REFUNDED" } });
    // A fully refunded member is no longer paid up.
    const user = await prisma.user.findUnique({ where: { id: p.userId }, select: { status: true } });
    if (user?.status === "CONFIRMED_PAID") {
      const bill = await getMemberBill(p.userId);
      if (bill && bill.remaining > 0) {
        await prisma.user.update({ where: { id: p.userId }, data: { status: "PENDING_PAYMENT" } });
      }
    }
  }
}
