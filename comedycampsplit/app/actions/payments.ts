"use server";

import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { SECURITY_DEPOSIT_USD } from "@/lib/pricing";
import { revalidatePath } from "next/cache";

export async function createCheckoutSession(userId: string, tripShare: number) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return { error: "NEXT_PUBLIC_APP_URL is not configured" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  const total = tripShare + SECURITY_DEPOSIT_USD;

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Trip share" },
          unit_amount: Math.round(tripShare * 100),
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Refundable security deposit",
            description: "Returned after the trip if the rules are followed and there's no damage.",
          },
          unit_amount: Math.round(SECURITY_DEPOSIT_USD * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${appUrl}/dashboard/payment?success=true`,
    cancel_url: `${appUrl}/dashboard/payment?cancelled=true`,
    customer_email: user.email,
    metadata: { userId, tripShare: String(tripShare), securityDeposit: String(SECURITY_DEPOSIT_USD) },
  });

  await prisma.payment.create({
    data: {
      userId,
      amount: total,
      stripeSessionId: session.id,
      status: "PENDING",
    },
  });

  return { url: session.url };
}

export async function getPaymentStatus(userId: string) {
  const payment = await prisma.payment.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return payment;
}

export async function markUserPaid(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { status: "CONFIRMED_PAID" },
  });
  revalidatePath("/admin/users");
  revalidatePath("/dashboard/roster");
  return { success: true };
}
