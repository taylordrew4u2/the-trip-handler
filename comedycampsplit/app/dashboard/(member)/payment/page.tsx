import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PaymentClient } from "./PaymentClient";
import { redirect } from "next/navigation";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { isApproved } from "@/lib/approval";
import { PageNote } from "@/components/PageNote";

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

  return (
    <div className="space-y-6 max-w-2xl">
      <PageNote pageKey="payment" />
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
