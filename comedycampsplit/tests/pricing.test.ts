import { describe, it, expect } from "vitest";
import { COST_SHARE_DIVISOR, SECURITY_DEPOSIT_USD, TRIP_CAPACITY } from "@/lib/pricing";

describe("pricing constants", () => {
  it("splits cost 10 ways while opening 13 roster slots", () => {
    // Capacity is intentionally decoupled from the cost divisor.
    expect(TRIP_CAPACITY).toBe(13);
    expect(COST_SHARE_DIVISOR).toBe(10);
    expect(TRIP_CAPACITY).toBeGreaterThan(COST_SHARE_DIVISOR);
  });

  it("computes the per-person share from the trip total", () => {
    const total = 4000 + 1000 + 600; // housing + transport + meals
    expect(total / COST_SHARE_DIVISOR).toBeCloseTo(560);
  });

  it("has a fixed refundable deposit", () => {
    expect(SECURITY_DEPOSIT_USD).toBe(75);
  });
});
