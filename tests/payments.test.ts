import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/blob", () => ({ deleteBlob: vi.fn(), uploadPaymentReceipt: vi.fn(), safeUploadType: () => "image/png" }));
vi.mock("@/lib/db", () => ({
  prisma: {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn(),
      delete: vi.fn(),
    },
    trip: { findFirst: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { reviewManualPayment, submitManualPayment } from "@/app/actions/payments";

const session = getServerSession as unknown as Mock;
const p = prisma as unknown as {
  payment: { findUnique: Mock; update: Mock; updateMany: Mock; create: Mock };
  trip: { findFirst: Mock };
  user: { findUnique: Mock; update: Mock };
};

beforeEach(() => {
  vi.clearAllMocks();
  p.payment.findUnique.mockResolvedValue({
    id: "pay1",
    method: "VENMO",
    status: "PENDING",
    userId: "u1",
    user: { tripId: "t1" },
  });
});

describe("reviewManualPayment", () => {
  it("rejects anyone who doesn't own the member's trip", async () => {
    session.mockResolvedValue({ user: { id: "other-member" } });
    p.trip.findFirst.mockResolvedValue(null);
    expect(await reviewManualPayment("pay1", true)).toEqual({ error: "Not your trip." });
    expect(p.payment.update).not.toHaveBeenCalled();
  });

  it("won't hand-confirm a card payment", async () => {
    session.mockResolvedValue({ user: { id: "owner" } });
    p.trip.findFirst.mockResolvedValue({ id: "t1" });
    p.payment.findUnique.mockResolvedValue({
      id: "pay1",
      method: "STRIPE",
      status: "PENDING",
      userId: "u1",
      user: { tripId: "t1" },
    });
    expect(await reviewManualPayment("pay1", true)).toEqual({ error: "Card payments are confirmed by Stripe." });
  });

  it("marks a rejected transfer FAILED without touching the member", async () => {
    session.mockResolvedValue({ user: { id: "owner" } });
    p.trip.findFirst.mockResolvedValue({ id: "t1" });
    p.payment.updateMany.mockResolvedValue({ count: 1 });
    expect(await reviewManualPayment("pay1", false)).toEqual({ success: true });
    expect(p.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }),
    );
    expect(p.user.update).not.toHaveBeenCalled();
  });
});

describe("submitManualPayment", () => {
  it("requires a receipt", async () => {
    session.mockResolvedValue({ user: { id: "u1" } });
    const form = new FormData();
    form.set("method", "VENMO");
    form.set("amount", "100");
    expect(await submitManualPayment(form)).toEqual({ error: "Attach a screenshot of the payment." });
    expect(p.payment.create).not.toHaveBeenCalled();
  });

  it("refuses a method the owner hasn't turned on", async () => {
    session.mockResolvedValue({ user: { id: "u1" } });
    p.user.findUnique.mockResolvedValue({
      status: "PENDING_PAYMENT",
      trip: { isLocked: true, venmoHandle: null, cashAppHandle: "owner" },
    });
    const form = new FormData();
    form.set("method", "VENMO");
    form.set("amount", "100");
    form.set("receipt", new File(["x"], "r.png", { type: "image/png" }));
    expect(await submitManualPayment(form)).toEqual({ error: "Venmo isn't accepted for this trip." });
  });
});
