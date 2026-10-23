"use server";

import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getMemberBill } from "@/lib/bill";
import { MAX_UPLOAD_BYTES, deleteUpload, safeUploadType, saveUpload } from "@/lib/files";
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
  if (method !== "VENMO" && method !== "CASH_APP" && method !== "OTHER") {
    return { error: "Pick how you paid." };
  }
  const amount = toCents(parseFloat(String(formData.get("amount") ?? "")));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter the amount you sent." };
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;

  const receipt = formData.get("receipt");
  const file = receipt instanceof File && receipt.size > 0 ? receipt : null;
  // Venmo and Cash App always leave a screenshot; "other" (cash, Zelle…) may not.
  if (!file && method !== "OTHER") return { error: "Attach a screenshot of the payment." };
  if (method === "OTHER" && !note && !file) return { error: "Say how you paid (cash, Zelle…) or attach a receipt." };
  const contentType = file ? safeUploadType(file, true) : null;
  if (file && file.size > MAX_UPLOAD_BYTES) return { error: "Receipt is too big — try a screenshot instead." };
  if (file && !contentType) return { error: "Receipt must be a photo (JPG, PNG, HEIC…) or a PDF." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, tripId: true, trip: { select: { isLocked: true, venmoHandle: true, cashAppHandle: true } } },
  });
  if (!user?.trip) return { error: "You're not on a trip yet." };
  if (user.status === "CONFIRMED_PAID") return { error: "You're already paid up." };
  if (user.status !== "APPROVED" && user.status !== "PENDING_PAYMENT") {
    return { error: "You need to be approved first." };
  }
  if (!user.trip.isLocked) return { error: "Trip isn't locked for payment yet." };
  if (method === "VENMO" && !user.trip.venmoHandle) return { error: "Venmo isn't accepted for this trip." };
  if (method === "CASH_APP" && !user.trip.cashAppHandle) return { error: "Cash App isn't accepted for this trip." };

  let receiptUrl: string | null = null;
  if (file && contentType) {
    try {
      receiptUrl = await saveUpload(file, {
        kind: "payment-receipt",
        contentType,
        uploaderId: userId,
        tripId: user.tripId,
      });
    } catch (err) {
      console.error("Payment receipt upload failed:", err);
      return { error: "Receipt upload failed. Please try again." };
    }
  }

  try {
    await prisma.payment.create({
      data: { userId, amount, method, note, status: "PENDING", receiptUrl },
    });
  } catch (err) {
    await deleteUpload(receiptUrl);
    throw err;
  }

  revalidatePath("/dashboard/payment");
  if (user.tripId) revalidatePath(`/dashboard/my-trips/${user.tripId}`);
  return { success: true };
}

/** The trip owner, and the member if it's on their trip — or an error. */
async function ownerOfMember(memberId: string) {
  const session = await getServerSession(authOptions);
  const ownerId = (session?.user as { id?: string } | undefined)?.id;
  if (!ownerId || ownerId === "admin") return { error: "Sign in first." } as const;
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { id: true, status: true, tripId: true },
  });
  if (!member?.tripId) return { error: "Not your trip." } as const;
  const trip = await prisma.trip.findFirst({ where: { id: member.tripId, ownerId }, select: { id: true } });
  if (!trip) return { error: "Not your trip." } as const;
  return { member, tripId: trip.id } as const;
}

/** Mark a member paid when their payments cover the bill (or back to owing when they don't). */
async function syncPaidStatus(memberId: string) {
  const member = await prisma.user.findUnique({ where: { id: memberId }, select: { status: true } });
  const bill = await getMemberBill(memberId);
  if (!member || !bill) return;
  if (bill.remaining <= 0 && (member.status === "APPROVED" || member.status === "PENDING_PAYMENT")) {
    await prisma.user.update({ where: { id: memberId }, data: { status: "CONFIRMED_PAID" } });
  } else if (bill.remaining > 0 && member.status === "CONFIRMED_PAID") {
    await prisma.user.update({ where: { id: memberId }, data: { status: "PENDING_PAYMENT" } });
  }
}

/**
 * The owner checks off money they received outside the app (Venmo, Cash App,
 * cash, anything) — no receipt needed, it counts straight away.
 */
export async function recordPaymentForMember(memberId: string, amountInput: number, methodInput: string, noteInput?: string) {
  const ctx = await ownerOfMember(memberId);
  if ("error" in ctx) return ctx;
  if (!["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"].includes(ctx.member.status)) {
    return { error: "They're not on the trip." };
  }
  const amount = toCents(Number(amountInput));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter the amount you received." };
  const method = ["VENMO", "CASH_APP", "CASH", "OTHER"].includes(methodInput)
    ? (methodInput as "VENMO" | "CASH_APP" | "CASH" | "OTHER")
    : "OTHER";
  const note = typeof noteInput === "string" ? noteInput.trim().slice(0, 500) || null : null;

  await prisma.payment.create({
    data: { userId: memberId, amount, method, note, status: "COMPLETED", reviewedAt: new Date() },
  });
  await syncPaidStatus(memberId);

  revalidatePath(`/dashboard/my-trips/${ctx.tripId}`);
  revalidatePath("/dashboard/payment");
  return { success: true };
}

/** Undo a payment the owner confirmed or recorded by mistake. Card payments are refunded in Stripe instead. */
export async function undoManualPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { userId: true, method: true, status: true },
  });
  if (!payment) return { error: "Payment not found." };
  const ctx = await ownerOfMember(payment.userId);
  if ("error" in ctx) return ctx;
  if (payment.method === "STRIPE") return { error: "Card payments are refunded in Stripe." };
  if (payment.status !== "COMPLETED") return { error: "Only confirmed payments can be undone." };

  await prisma.payment.update({ where: { id: paymentId }, data: { status: "FAILED", reviewedAt: new Date() } });
  await syncPaidStatus(payment.userId);

  revalidatePath(`/dashboard/my-trips/${ctx.tripId}`);
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

  if (approve) await syncPaidStatus(payment.userId);

  revalidatePath(`/dashboard/my-trips/${tripId}`);
  revalidatePath("/dashboard/payment");
  return { success: true };
}
