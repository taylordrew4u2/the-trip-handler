export const SECURITY_DEPOSIT_USD = 75;

/**
 * Hard cap on the trip — admin enters total costs (housing, transport, meals)
 * and the system divides by this number to compute each person's share.
 * The roster is rendered as TRIP_CAPACITY slots, filling in with approved
 * users and showing "Open" for empty slots.
 */
export const TRIP_CAPACITY = 10;
