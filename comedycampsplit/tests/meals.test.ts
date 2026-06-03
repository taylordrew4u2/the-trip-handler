import { describe, it, expect } from "vitest";
import { SLOT_DEFS } from "@/lib/meals";

describe("meal slot definitions", () => {
  it("defines a contiguous, ordered set of slots", () => {
    const orders = SLOT_DEFS.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(orders).toEqual(Array.from({ length: SLOT_DEFS.length }, (_, i) => i));
  });

  it("marks only the travel-snacks slot optional", () => {
    const optional = SLOT_DEFS.filter((s) => s.optional);
    expect(optional).toHaveLength(1);
    expect(optional[0].meal).toMatch(/snack/i);
  });
});
