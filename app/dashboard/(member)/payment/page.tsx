import { prisma } from "@/lib/db";
import { PaymentClient } from "./PaymentClient";
import { redirect } from "next/navigation";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { isAuthzError, requireApprovedMember } from "@/lib/authz";
import { PageNote } from "@/components/PageNote";
import { getUserTrip } from "@/lib/trip";

export default async function PaymentPage() {
  // Approval is read from the database, not the sign-in-time JWT, so a
  // member removed from the trip loses access on their next request.
  const member = await requireApprovedMember();
  if (isAuthzError(member)) return <ApprovalRequired what="Payment" />;
  const userId = member.id;
  if (!userId) redirect("/login");

  const [trip, user, payment] = await Promise.all([
    getUserTrip(userId),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.payment.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <PageNote pageKey="payment" />
      <h1 className="font-serif text-3xl font-medium text-stone-900">Payment</h1>
      <PaymentClient trip={trip} user={user} payment={payment} />
    </div>
  );
}
