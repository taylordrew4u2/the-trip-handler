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
