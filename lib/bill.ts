import { prisma } from "@/lib/db";
import { COST_SHARE_DIVISOR, memberShare, toCents } from "@/lib/pricing";

/**
 * One member's bill. Holds private numbers (their personal adjustment), so it
 * is computed server-side for either the member themselves or the trip owner
 * — never shipped to anyone else.
 */
export type MemberBill = {
  /** Even split of the trip total (final once locked, running estimate before). */
  baseShare: number;
  bedLabel: string | null;
  bedAdjustment: number;
  personalAdjustment: number;
  /** baseShare + bed + personal, floored at zero. */
  share: number;
  deposit: number;
  total: number;
  /** Sum of COMPLETED payments. */
  paid: number;
  remaining: number;
};

type TripPricing = {
  finalPrice: number | null;
  isLocked: boolean;
  housingPrice: number | null;
  transportPrice: number | null;
  mealsPrice: number | null;
  depositAmount: number;
};

export function baseShareOf(trip: TripPricing): number {
  if (trip.isLocked && trip.finalPrice != null) return trip.finalPrice;
  const total = (trip.housingPrice ?? 0) + (trip.transportPrice ?? 0) + (trip.mealsPrice ?? 0);
  return toCents(total / COST_SHARE_DIVISOR);
}

export function computeBill(
  trip: TripPricing,
  member: {
    priceAdjustment: number;
    bed: { label: string; priceAdjustment: number } | null;
    completedPayments: number[];
  },
): MemberBill {
  const baseShare = baseShareOf(trip);
  const bedAdjustment = member.bed?.priceAdjustment ?? 0;
  const share = memberShare(baseShare, bedAdjustment, member.priceAdjustment);
  const deposit = trip.depositAmount;
  const total = toCents(share + deposit);
  const paid = toCents(member.completedPayments.reduce((s, a) => s + a, 0));
  return {
    baseShare,
    bedLabel: member.bed?.label ?? null,
    bedAdjustment,
    personalAdjustment: member.priceAdjustment,
    share,
    deposit,
    total,
    paid,
    remaining: Math.max(0, toCents(total - paid)),
  };
}

/** Load and compute the bill for one user on their trip. */
export async function getMemberBill(userId: string): Promise<MemberBill | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      priceAdjustment: true,
      trip: true,
      bedAssignment: { select: { bed: { select: { label: true, priceAdjustment: true } } } },
      payments: { where: { status: "COMPLETED" }, select: { amount: true } },
    },
  });
  if (!user?.trip) return null;
  return computeBill(user.trip, {
    priceAdjustment: user.priceAdjustment,
    bed: user.bedAssignment?.bed ?? null,
    completedPayments: user.payments.map((p) => p.amount),
  });
}
