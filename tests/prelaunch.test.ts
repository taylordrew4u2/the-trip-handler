import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

// Guards added before real use: money can't be recorded wrong, members can't
// edit fields they shouldn't, and approvals respect the trip's state.
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/files", () => ({ deleteUpload: vi.fn(), saveUpload: vi.fn(), safeUploadType: () => "image/png", MAX_UPLOAD_BYTES: 4194304 }));
vi.mock("@/lib/resend", () => ({
  sendApprovalEmail: vi.fn(),
  sendRejectionEmail: vi.fn(),
  sendTripLockedEmail: vi.fn(),
  notifyAdmin: vi.fn(),
}));
vi.mock("@/lib/bill", () => ({ getMemberBill: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    payment: { upsert: vi.fn(), updateMany: vi.fn(), count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
    trip: { findFirst: vi.fn(), findUnique: vi.fn() },
    guestForm: { findUnique: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { getMemberBill } from "@/lib/bill";
import { getStripe } from "@/lib/stripe";
import { settleCheckoutSession } from "@/lib/checkout";
import { createCheckoutSession } from "@/app/actions/payments";
import { updateProfile } from "@/app/actions/profile";
import { approveTripApplicant } from "@/app/actions/trips";
import type Stripe from "stripe";

const session = getServerSession as unknown as Mock;
const bill = getMemberBill as unknown as Mock;
const p = prisma as unknown as {
  payment: { upsert: Mock; updateMany: Mock; count: Mock; findMany: Mock; create: Mock };
  user: { findUnique: Mock; update: Mock; updateMany: Mock; count: Mock };
  trip: { findFirst: Mock; findUnique: Mock };
  guestForm: { findUnique: Mock };
};

const paidSession = (over: Partial<Stripe.Checkout.Session> = {}) =>
  ({
    id: "cs_1",
    status: "complete",
    payment_status: "paid",
    amount_total: 50000,
    payment_intent: "pi_1",
    metadata: { userId: "u1" },
    ...over,
  }) as unknown as Stripe.Checkout.Session;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
});

describe("recording a card payment", () => {
  it("records what Stripe actually collected", async () => {
    p.user.findUnique.mockResolvedValue({ status: "PENDING_PAYMENT" });
    bill.mockResolvedValue({ remaining: 0 });
    await settleCheckoutSession(paidSession());
    expect(p.payment.upsert.mock.calls[0][0].update.amount).toBe(500);
    expect(p.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { status: "CONFIRMED_PAID" } });
  });

  it("doesn't mark someone paid when the bill went up after checkout", async () => {
    p.user.findUnique.mockResolvedValue({ status: "PENDING_PAYMENT" });
    bill.mockResolvedValue({ remaining: 100 });
    await settleCheckoutSession(paidSession());
    expect(p.user.update).not.toHaveBeenCalled();
  });

  it("never confirms a rejected or withdrawn person", async () => {
    p.user.findUnique.mockResolvedValue({ status: "CANCELLED" });
    bill.mockResolvedValue({ remaining: 0 });
    await settleCheckoutSession(paidSession());
    expect(p.user.update).not.toHaveBeenCalled();
  });

  it("marks an expired checkout failed and records nothing", async () => {
    await settleCheckoutSession(paidSession({ status: "expired", payment_status: "unpaid" }));
    expect(p.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "FAILED" } }),
    );
    expect(p.payment.upsert).not.toHaveBeenCalled();
  });
});

describe("starting a card checkout", () => {
  beforeEach(() => session.mockResolvedValue({ user: { id: "u1" } }));

  it("refuses people who aren't approved", async () => {
    p.user.findUnique.mockResolvedValue({ id: "u1", email: "a@x", status: "PENDING", trip: { isLocked: true, finalPrice: 100 } });
    expect(await createCheckoutSession()).toEqual({ error: "You need to be approved first." });
  });

  it("waits while a Venmo/Cash App payment is under review", async () => {
    p.user.findUnique.mockResolvedValue({ id: "u1", email: "a@x", status: "PENDING_PAYMENT", trip: { isLocked: true, finalPrice: 100 } });
    p.payment.count.mockResolvedValue(1);
    const result = await createCheckoutSession();
    expect(result).toHaveProperty("error");
    expect(getStripe).not.toHaveBeenCalled();
  });
});

describe("profile saves", () => {
  it("ignores status, role, trip and price fields", async () => {
    session.mockResolvedValue({ user: { id: "u1" } });
    const sneaky = { name: "Ann", status: "CONFIRMED_PAID", role: "ADMIN", priceAdjustment: -500, tripId: "t9" };
    expect(await updateProfile("u1", sneaky as never)).toEqual({ success: true });
    expect(p.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { name: "Ann" } });
  });
});

describe("approving an applicant", () => {
  beforeEach(() => {
    session.mockResolvedValue({ user: { id: "owner" } });
    p.user.findUnique.mockResolvedValue({ id: "u1", email: "a@x", name: "A", tripId: "t1" });
    p.trip.findFirst.mockResolvedValue({ id: "t1" });
    p.guestForm.findUnique.mockResolvedValue({ id: "f1" });
  });

  it("refuses when the roster is full", async () => {
    p.trip.findUnique.mockResolvedValue({ id: "t1", rosterCapacity: 2, isLocked: false });
    p.user.count.mockResolvedValue(2);
    const result = await approveTripApplicant("u1");
    expect((result as { error: string }).error).toMatch(/full/);
    expect(p.user.updateMany).not.toHaveBeenCalled();
  });

  it("moves people approved after the price lock straight to payment", async () => {
    p.trip.findUnique.mockResolvedValue({ id: "t1", rosterCapacity: 10, isLocked: true });
    p.user.count.mockResolvedValue(3);
    p.user.updateMany.mockResolvedValue({ count: 1 });
    bill.mockResolvedValue({ share: 400, deposit: 75 });
    expect(await approveTripApplicant("u1")).toEqual({ success: true });
    expect(p.user.updateMany.mock.calls[0][0].data).toEqual({ status: "PENDING_PAYMENT" });
  });

  it("won't revive someone who already left", async () => {
    p.trip.findUnique.mockResolvedValue({ id: "t1", rosterCapacity: 10, isLocked: false });
    p.user.count.mockResolvedValue(3);
    p.user.updateMany.mockResolvedValue({ count: 0 });
    expect((await approveTripApplicant("u1")) as { error: string }).toHaveProperty("error");
  });
});

describe("payments the owner checks off", () => {
  it("records money the owner received and marks the member paid when covered", async () => {
    const { recordPaymentForMember } = await import("@/app/actions/payments");
    session.mockResolvedValue({ user: { id: "owner" } });
    p.user.findUnique.mockResolvedValue({ id: "u1", status: "PENDING_PAYMENT", tripId: "t1" });
    p.trip.findFirst.mockResolvedValue({ id: "t1" });
    bill.mockResolvedValue({ remaining: 0 });
    expect(await recordPaymentForMember("u1", 380, "CASH", "paid at dinner")).toEqual({ success: true });
    expect(p.payment.create.mock.calls[0][0].data).toMatchObject({
      userId: "u1",
      amount: 380,
      method: "CASH",
      status: "COMPLETED",
    });
    expect(p.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { status: "CONFIRMED_PAID" } });
  });

  it("only the trip owner can record a payment", async () => {
    const { recordPaymentForMember } = await import("@/app/actions/payments");
    session.mockResolvedValue({ user: { id: "u1" } });
    p.user.findUnique.mockResolvedValue({ id: "u1", status: "PENDING_PAYMENT", tripId: "t1" });
    p.trip.findFirst.mockResolvedValue(null);
    expect(await recordPaymentForMember("u1", 380, "CASH")).toEqual({ error: "Not your trip." });
    expect(p.payment.create).not.toHaveBeenCalled();
  });
});
