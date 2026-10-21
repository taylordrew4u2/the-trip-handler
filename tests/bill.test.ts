import { describe, it, expect } from "vitest";
import { computeBill, baseShareOf } from "@/lib/bill";
import { formatAdjustment, memberShare } from "@/lib/pricing";

const lockedTrip = {
  finalPrice: 500,
  isLocked: true,
  housingPrice: 4000,
  transportPrice: 600,
  mealsPrice: 400,
  depositAmount: 100,
};

describe("member bill", () => {
  it("adds bed and private adjustments to the base share, plus the trip's deposit", () => {
    const bill = computeBill(lockedTrip, {
      priceAdjustment: -75,
      bed: { label: "King", priceAdjustment: 40 },
      completedPayments: [],
    });
    expect(bill.share).toBe(465);
    expect(bill.deposit).toBe(100);
    expect(bill.total).toBe(565);
    expect(bill.remaining).toBe(565);
  });

  it("subtracts confirmed payments from the balance", () => {
    const bill = computeBill(lockedTrip, { priceAdjustment: 0, bed: null, completedPayments: [200, 100] });
    expect(bill.paid).toBe(300);
    expect(bill.remaining).toBe(300);
  });

  it("never goes below zero", () => {
    expect(memberShare(100, -50, -200)).toBe(0);
    const bill = computeBill(lockedTrip, { priceAdjustment: 0, bed: null, completedPayments: [1000] });
    expect(bill.remaining).toBe(0);
  });

  it("estimates from the line totals before the trip locks", () => {
    expect(baseShareOf({ ...lockedTrip, isLocked: false, finalPrice: null })).toBe(500);
  });

  it("formats adjustments with a sign", () => {
    expect(formatAdjustment(20)).toBe("+$20.00");
    expect(formatAdjustment(-15.5)).toBe("−$15.50");
  });
});
