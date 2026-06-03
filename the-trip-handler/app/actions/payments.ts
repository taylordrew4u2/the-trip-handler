"use server";

import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { SECURITY_DEPOSIT_USD } from "@/lib/pricing";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function createCheckoutSession() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return { error: "NEXT_PUBLIC_APP_URL is not configured" };

  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  if (!sessionUser?.id || sessionUser.role === "ADMIN") {
    return { error: "Sign in as a participant first." };
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: { trip: true },
  });
  if (!user) return { error: "User not found" };
  if (!user.trip?.isLocked || !user.trip.finalPrice) {
    return { error: "Trip isn't locked for payment yet." };
  }

  const tripShare = user.trip.finalPrice;
  const total = tripShare + SECURITY_DEPOSIT_USD;

  const stripe = getStripe();
  const checkout = await stripe.checkout.sessions.create({
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
    metadata: {
      userId: user.id,
      tripShare: String(tripShare),
      securityDeposit: String(SECURITY_DEPOSIT_USD),
    },
  });

  await prisma.payment.create({
    data: {
      userId: user.id,
      amount: total,
      stripeSessionId: checkout.id,
      status: "PENDING",
    },
  });

  return { url: checkout.url };
}
