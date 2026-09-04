import { prisma } from "@/lib/db";
import { sessionUserId } from "@/lib/authz";

/**
 * The caller's approval status, read from the database.
 *
 * It used to come off the NextAuth session, which is a JWT and therefore a
 * snapshot from sign-in: a member removed from a trip kept a token still
 * saying APPROVED and kept seeing the pages. Reading the row costs one query
 * per render and makes a revoked approval take effect on the next request.
 */
export async function getUserStatus(): Promise<string | null> {
  const userId = await sessionUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  return user?.status ?? null;
}

export function isApproved(status: string | null | undefined): boolean {
  return status === "APPROVED" || status === "PENDING_PAYMENT" || status === "CONFIRMED_PAID";
}
