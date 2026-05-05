"use server";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createCheckoutSession(userId: string, amount: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

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
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payment?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payment?cancelled=true`,
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
