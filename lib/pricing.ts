export const SECURITY_DEPOSIT_USD = 75;

/**
 * Hard cap on the trip — the roster is rendered as TRIP_CAPACITY slots,
 * filling in with approved users and showing "Open" for empty slots.
 */
export const TRIP_CAPACITY = 13;

/**
 * Per-person trip share is always computed as total ÷ COST_SHARE_DIVISOR,
 * not divided by TRIP_CAPACITY. This keeps each person's share at the
 * baseline 10-person cost even though we open extra spots.
 */
export const COST_SHARE_DIVISOR = 10;

/** Round to whole cents. */
export function toCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * What one member owes for the trip (before the deposit): the even base share,
 * plus their bed's price adjustment, plus their private adjustment. Never
 * below zero.
 */
export function memberShare(baseShare: number, bedAdjustment = 0, personalAdjustment = 0): number {
  return Math.max(0, toCents(baseShare + bedAdjustment + personalAdjustment));
}

/** "+$20.00" / "−$15.00" for a price adjustment. */
export function formatAdjustment(n: number): string {
  return `${n < 0 ? "−" : "+"}$${Math.abs(n).toFixed(2)}`;
}
