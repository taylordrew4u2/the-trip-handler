"use server";

import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createCheckoutSession(userId: string, amount: number) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return { error: "NEXT_PUBLIC_APP_URL is not configured" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Comedy Summer Camp" },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${appUrl}/dashboard/payment?success=true`,
    cancel_url: `${appUrl}/dashboard/payment?cancelled=true`,
    customer_email: user.email,
    metadata: { userId },
  });

  await prisma.payment.create({
    data: {
      userId,
      amount,
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
