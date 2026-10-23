"use server";

import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getMemberBill } from "@/lib/bill";
import { deleteBlob, safeUploadType, uploadPaymentReceipt } from "@/lib/blob";
import { toCents } from "@/lib/pricing";
import { settleCheckoutSession } from "@/lib/checkout";

async function participantId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  if (!sessionUser?.id || sessionUser.id === "admin" || sessionUser.role === "ADMIN") return null;
  return sessionUser.id;
}

export async function createCheckoutSession() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return { error: "NEXT_PUBLIC_APP_URL is not configured" };

  const userId = await participantId();
  if (!userId) return { error: "Sign in as a participant first." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, status: true, trip: { select: { isLocked: true, finalPrice: true } } },
  });
  if (!user) return { error: "User not found" };
  // Only approved members pay; pending, rejected or withdrawn people can't.
  if (user.status !== "APPROVED" && user.status !== "PENDING_PAYMENT") {
    return { error: user.status === "CONFIRMED_PAID" ? "You're already paid up." : "You need to be approved first." };
  }
  if (!user.trip?.isLocked || user.trip.finalPrice == null) {
    return { error: "Trip isn't locked for payment yet." };
  }

  const pendingManual = await prisma.payment.count({
    where: { userId, status: "PENDING", method: { not: "STRIPE" } },
  });
  if (pendingManual > 0) {
    return { error: "You have a Venmo/Cash App payment waiting for the organizer to confirm. Wait for that first." };
  }

  const bill = await getMemberBill(user.id);
  if (!bill) return { error: "Trip isn't locked for payment yet." };
  if (bill.remaining <= 0) return { error: "You're already paid up." };
  if (bill.remaining < 0.5) {
    return { error: "The balance is under Stripe's $0.50 minimum — settle it with the organizer directly." };
  }

  // Nothing paid yet: itemize share + deposit. Partly paid (e.g. some by
  // Venmo): charge the balance as one line.
  const lineItems =
    bill.paid === 0
      ? [
          ...(bill.share > 0
            ? [
                {
                  price_data: {
                    currency: "usd",
                    product_data: { name: "Trip share" },
                    unit_amount: Math.round(bill.share * 100),
                  },
                  quantity: 1,
                },
              ]
            : []),
          ...(bill.deposit > 0
            ? [
                {
                  price_data: {
                    currency: "usd",
                    product_data: {
                      name: "Refundable security deposit",
                      description: "Returned after the trip if the rules are followed and there's no damage.",
                    },
                    unit_amount: Math.round(bill.deposit * 100),
                  },
                  quantity: 1,
                },
              ]
            : []),
        ]
      : [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Remaining trip balance" },
              unit_amount: Math.round(bill.remaining * 100),
            },
            quantity: 1,
          },
        ];

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("Stripe isn't configured:", err);
    return { error: "Card payments aren't set up yet. Use Venmo/Cash App or ask the organizer." };
  }

  // Close any checkout this member opened before, so two tabs (or a back
  // button) can't both be paid.
  const open = await prisma.payment.findMany({
    where: { userId, method: "STRIPE", status: "PENDING", stripeSessionId: { not: null } },
    select: { id: true, stripeSessionId: true },
  });
  for (const p of open) {
    try {
      const prior = await stripe.checkout.sessions.retrieve(p.stripeSessionId!);
      if (prior.status === "open") await stripe.checkout.sessions.expire(prior.id);
      if (prior.status === "complete") {
        // Paid but never recorded (webhook missed) — record it instead of charging again.
        await settleCheckoutSession(prior);
        return { error: "Your earlier card payment just went through. Refresh the page." };
      }
      await prisma.payment.update({ where: { id: p.id }, data: { status: "FAILED" } });
    } catch (err) {
      console.error("Couldn't close earlier checkout:", err);
      return { error: "Couldn't start checkout. Please try again in a minute." };
    }
  }

  let checkout;
  try {
    checkout = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${appUrl}/dashboard/payment?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/payment?cancelled=true`,
      customer_email: user.email,
      metadata: { userId: user.id },
    });
  } catch (err) {
    console.error("Stripe checkout failed:", err);
    return { error: "Couldn't start checkout. Please try again in a minute." };
  }

  try {
    await prisma.payment.create({
      data: {
        userId: user.id,
        amount: bill.remaining,
        stripeSessionId: checkout.id,
        status: "PENDING",
        method: "STRIPE",
      },
    });
  } catch (err) {
    console.error("Couldn't record checkout; expiring it:", err);
    await stripe.checkout.sessions.expire(checkout.id).catch(() => {});
    return { error: "Couldn't start checkout. Please try again." };
  }

  return { url: checkout.url };
}

/**
 * Called when a member returns from Stripe. Records the payment straight from
 * Stripe so the page is right even if the webhook is slow or misconfigured.
 */
export async function reconcileCheckout(sessionId: string) {
  const userId = await participantId();
  if (!userId || !sessionId) return;
  const row = await prisma.payment.findUnique({ where: { stripeSessionId: sessionId }, select: { userId: true } });
  if (row?.userId !== userId) return;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.userId === userId) await settleCheckoutSession(session);
  } catch (err) {
    console.error("reconcileCheckout failed:", err);
  }
}

/**
 * A member reports a Venmo or Cash App payment they sent the owner, with a
 * screenshot. It sits as PENDING until the owner confirms or rejects it.
 */
export async function submitManualPayment(formData: FormData) {
  const userId = await participantId();
  if (!userId) return { error: "Sign in as a participant first." };

  const method = formData.get("method");
  if (method !== "VENMO" && method !== "CASH_APP") return { error: "Pick Venmo or Cash App." };
  const amount = toCents(parseFloat(String(formData.get("amount") ?? "")));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter the amount you sent." };
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;

  const receipt = formData.get("receipt");
  const file = receipt instanceof File && receipt.size > 0 ? receipt : null;
  if (!file) return { error: "Attach a screenshot of the payment." };
  if (file.size > 10 * 1024 * 1024) return { error: "Receipt must be 10MB or less." };
  if (!safeUploadType(file, true)) return { error: "Receipt must be a photo (JPG, PNG, HEIC…) or a PDF." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, trip: { select: { isLocked: true, venmoHandle: true, cashAppHandle: true } } },
  });
  if (!user?.trip) return { error: "You're not on a trip yet." };
  if (user.status === "CONFIRMED_PAID") return { error: "You're already paid up." };
  if (user.status !== "APPROVED" && user.status !== "PENDING_PAYMENT") {
    return { error: "You need to be approved first." };
  }
  if (!user.trip.isLocked) return { error: "Trip isn't locked for payment yet." };
  if (method === "VENMO" && !user.trip.venmoHandle) return { error: "Venmo isn't accepted for this trip." };
  if (method === "CASH_APP" && !user.trip.cashAppHandle) return { error: "Cash App isn't accepted for this trip." };

  const payment = await prisma.payment.create({
    data: { userId, amount, method, note, status: "PENDING" },
  });

  let url: string | null = null;
  try {
    url = await uploadPaymentReceipt(file, payment.id);
    await prisma.payment.update({ where: { id: payment.id }, data: { receiptUrl: url } });
  } catch (err) {
    console.error("Payment receipt upload failed:", err);
    if (url) {
      try {
        await deleteBlob(url);
      } catch (cleanupErr) {
        console.error("Failed to cleanup payment receipt:", cleanupErr);
      }
    }
    await prisma.payment.delete({ where: { id: payment.id } });
    return { error: "Receipt upload failed. Please try again." };
  }

  revalidatePath("/dashboard/payment");
  return { success: true };
}

/**
 * The trip owner confirms or rejects one Venmo/Cash App payment. Each is
 * reviewed on its own; once confirmed payments cover the member's total they
 * flip to CONFIRMED_PAID.
 */
export async function reviewManualPayment(paymentId: string, approve: boolean) {
  const session = await getServerSession(authOptions);
  const ownerId = (session?.user as { id?: string } | undefined)?.id;
  if (!ownerId || ownerId === "admin") return { error: "Sign in first." };

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, method: true, status: true, userId: true, user: { select: { tripId: true } } },
  });
  const tripId = payment?.user.tripId;
  if (!payment || !tripId) return { error: "Not your trip." };
  const trip = await prisma.trip.findFirst({ where: { id: tripId, ownerId }, select: { id: true } });
  if (!trip) return { error: "Not your trip." };
  if (payment.method === "STRIPE") return { error: "Card payments are confirmed by Stripe." };
  if (payment.status !== "PENDING") return { error: "Already reviewed." };

  // Claim the review atomically so a double click can't count it twice.
  const claimed = await prisma.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: approve ? "COMPLETED" : "FAILED", reviewedAt: new Date() },
  });
  if (claimed.count === 0) return { error: "Already reviewed." };

  if (approve) {
    const member = await prisma.user.findUnique({ where: { id: payment.userId }, select: { status: true } });
    const bill = await getMemberBill(payment.userId);
    if (bill && bill.remaining <= 0 && (member?.status === "APPROVED" || member?.status === "PENDING_PAYMENT")) {
      await prisma.user.update({ where: { id: payment.userId }, data: { status: "CONFIRMED_PAID" } });
    }
  }

  revalidatePath(`/dashboard/my-trips/${tripId}`);
  revalidatePath("/dashboard/payment");
  return { success: true };
}
