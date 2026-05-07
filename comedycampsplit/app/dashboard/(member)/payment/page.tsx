import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PaymentClient } from "./PaymentClient";
import { redirect } from "next/navigation";

export default async function PaymentPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id ?? "";
  if (!userId) redirect("/login");

  const [trip, user, payment] = await Promise.all([
    prisma.trip.findFirst(),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.payment.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!trip?.isLocked) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">💳 Payment</h1>
        <div className="bg-white rounded-2xl border border-purple-100 p-8 text-center">
          <div className="text-5xl mb-4">🔓</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Trip Not Yet Finalized</h2>
          <p className="text-gray-500">
            Payment will be available once the admin locks the trip and sets the final price.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">💳 Payment</h1>
      <PaymentClient
        trip={trip}
        user={user}
        payment={payment}
        userId={userId}
      />
    </div>
  );
}
