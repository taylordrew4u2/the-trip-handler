import { describe, it, expect } from "vitest";
import { isApproved } from "@/lib/approval";

describe("isApproved", () => {
  it("treats approved / paying / paid statuses as approved", () => {
    expect(isApproved("APPROVED")).toBe(true);
    expect(isApproved("PENDING_PAYMENT")).toBe(true);
    expect(isApproved("CONFIRMED_PAID")).toBe(true);
  });

  it("treats pending, cancelled, and missing statuses as not approved", () => {
    expect(isApproved("PENDING")).toBe(false);
    expect(isApproved("CANCELLED")).toBe(false);
    expect(isApproved(null)).toBe(false);
    expect(isApproved(undefined)).toBe(false);
  });
});
