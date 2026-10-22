import { describe, it, expect } from "vitest";
import { SECURITY_DEPOSIT_USD, TRIP_CAPACITY } from "@/lib/pricing";

describe("pricing constants", () => {
  it("keeps roster capacity independent of cost sharing", () => {
    expect(TRIP_CAPACITY).toBe(13);
  });

  it("has a fixed refundable deposit", () => {
    expect(SECURITY_DEPOSIT_USD).toBe(75);
  });
});
