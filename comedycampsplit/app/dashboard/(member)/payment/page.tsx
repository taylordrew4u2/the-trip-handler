import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PaymentClient } from "./PaymentClient";
import { redirect } from "next/navigation";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { isApproved } from "@/lib/approval";

export default async function PaymentPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; status?: string } | undefined;
  if (!isApproved(sessionUser?.status)) return <ApprovalRequired what="Payment" />;
  const userId = sessionUser?.id ?? "";
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
      <div className="space-y-6 max-w-2xl">
        <h1 className="font-serif text-3xl font-medium text-stone-900">Payment</h1>
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-3">Not yet</p>
          <h2 className="font-serif text-xl font-medium text-stone-900 mb-2">Trip isn&apos;t finalized</h2>
          <p className="text-stone-600 text-sm">
            Payment will open once admin locks the trip and sets the final price. You&apos;ll get
            an email at that point.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-serif text-3xl font-medium text-stone-900">Payment</h1>
      <PaymentClient
        trip={trip}
        user={user}
        payment={payment}
        userId={userId}
      />
    </div>
  );
}
