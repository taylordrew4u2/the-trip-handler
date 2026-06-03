import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getUserStatus(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { status?: string } | undefined)?.status ?? null;
}

export function isApproved(status: string | null | undefined): boolean {
  return status === "APPROVED" || status === "PENDING_PAYMENT" || status === "CONFIRMED_PAID";
}
