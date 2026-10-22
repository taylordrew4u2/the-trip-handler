export const SECURITY_DEPOSIT_USD = 75;

/**
 * Hard cap on the trip — the roster is rendered as TRIP_CAPACITY slots,
 * filling in with approved users and showing "Open" for empty slots.
 */
export const TRIP_CAPACITY = 13;

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

/** Whether a trip has a feature the owner can switch off (meals, transport, ...). */
export function hasFeature(trip: { disabledSections?: readonly string[] | null }, key: string): boolean {
  return !(trip.disabledSections ?? []).includes(key);
}

/** Whether a trip has meals at all. Owners turn the Meals section off when it doesn't. */
export function hasMeals(trip: { disabledSections?: readonly string[] | null }): boolean {
  return hasFeature(trip, "meals");
}

/** Trip cost total. Meals / transport lines drop out when the trip doesn't have them. */
export function tripCostTotal(trip: {
  housingPrice: number | null;
  transportPrice: number | null;
  mealsPrice: number | null;
  disabledSections?: readonly string[] | null;
}): number {
  return (
    (trip.housingPrice ?? 0) +
    (hasFeature(trip, "transport") ? trip.transportPrice ?? 0 : 0) +
    (hasMeals(trip) ? trip.mealsPrice ?? 0 : 0)
  );
}
