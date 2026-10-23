import { describe, it, expect } from "vitest";
import { SECURITY_DEPOSIT_USD } from "@/lib/pricing";

describe("pricing constants", () => {
  it("has a fixed refundable deposit", () => {
    expect(SECURITY_DEPOSIT_USD).toBe(75);
  });
});
