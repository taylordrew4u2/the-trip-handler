import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

/**
 * The member-side authorization boundary.
 *
 * These exist because two of these actions used to get it wrong in the same
 * two ways, and both mistakes are invisible from the UI:
 *
 *  - They read `status` off the NextAuth JWT. A JWT is a snapshot from
 *    sign-in, so a member who has since been cancelled or removed keeps a
 *    token that still says APPROVED, and the action honours a permission that
 *    was revoked.
 *
 *  - They checked "is this caller approved?" without checking "approved on
 *    *this* trip". A server action is a public endpoint taking ids from the
 *    caller, so an approved member of one trip could pass another trip's bed
 *    id and act on someone else's trip.
 *
 * Each test drives a real action and asserts that nothing was written.
 */

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/resend", () => ({ sendBedBumpEmail: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    bed: { findUnique: vi.fn() },
    comment: { findUnique: vi.fn(), create: vi.fn() },
    reaction: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    bedAssignment: { deleteMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    bedmateRequest: { findUnique: vi.fn(), upsert: vi.fn(), delete: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { claimBedSlot, bumpFromSingle, requestBedmate } from "@/app/actions/sleeping";
import { postComment, toggleReaction } from "@/app/actions/board";

const session = getServerSession as unknown as Mock;
const p = prisma as unknown as {
  user: { findUnique: Mock };
  bed: { findUnique: Mock };
  bedAssignment: { deleteMany: Mock; create: Mock; count: Mock };
  bedmateRequest: { findUnique: Mock; upsert: Mock };
  comment: { findUnique: Mock; create: Mock };
  reaction: { findUnique: Mock; create: Mock; delete: Mock };
  $transaction: Mock;
};

const MY_TRIP = "trip-mine";
const OTHER_TRIP = "trip-theirs";

/** A bed on someone else's trip — the id a caller would have to guess or scrape. */
function bedOnOtherTrip(overrides: Record<string, unknown> = {}) {
  return {
    id: "bed-1",
    tripId: OTHER_TRIP,
    type: "DOUBLE",
    womenOnly: false,
    assignments: [{ userId: "someone", user: { gender: "male", email: "a@b.c", name: "A" } }],
    ...overrides,
  };
}

/** What the database says about the caller, which is what must be believed. */
function dbUser(overrides: Record<string, unknown> = {}) {
  return { status: "APPROVED", tripId: MY_TRIP, role: "PARTICIPANT", gender: "female", ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  // A session that claims everything is fine. The point of these tests is that
  // the actions do not take its word for any of it.
  session.mockResolvedValue({
    user: { id: "me", role: "PARTICIPANT", status: "APPROVED" },
  });
  p.$transaction.mockResolvedValue(undefined);
});

function expectNoWrites() {
  expect(p.$transaction).not.toHaveBeenCalled();
  expect(p.bedAssignment.create).not.toHaveBeenCalled();
  expect(p.bedAssignment.deleteMany).not.toHaveBeenCalled();
  expect(p.bedmateRequest.upsert).not.toHaveBeenCalled();
}

describe("cross-trip isolation", () => {
  it("claimBedSlot refuses a bed belonging to another trip", async () => {
    p.bed.findUnique.mockResolvedValue(bedOnOtherTrip());
    p.user.findUnique.mockResolvedValue(dbUser());

    const result = await claimBedSlot("bed-1");

    expect(result).toEqual({ error: "That isn't on your trip." });
    expectNoWrites();
  });

  it("bumpFromSingle refuses a bed belonging to another trip", async () => {
    p.bed.findUnique.mockResolvedValue(bedOnOtherTrip({ type: "SINGLE" }));
    p.user.findUnique.mockResolvedValue(dbUser());

    const result = await bumpFromSingle("bed-1");

    expect(result).toEqual({ error: "That isn't on your trip." });
    expectNoWrites();
  });

  it("requestBedmate refuses a bed belonging to another trip", async () => {
    p.bed.findUnique.mockResolvedValue(bedOnOtherTrip());
    p.user.findUnique.mockResolvedValue(dbUser());

    const result = await requestBedmate("bed-1", "someone");

    expect(result).toEqual({ error: "That isn't on your trip." });
    expectNoWrites();
  });
});

describe("status is read from the database, not the session", () => {
  it("refuses a caller whose token says APPROVED but whose row says CANCELLED", async () => {
    p.bed.findUnique.mockResolvedValue(bedOnOtherTrip({ tripId: MY_TRIP }));
    p.user.findUnique.mockResolvedValue(dbUser({ status: "CANCELLED" }));

    const result = await claimBedSlot("bed-1");

    expect(result).toEqual({ error: "You need to be approved first." });
    expectNoWrites();
  });

  it("refuses a caller whose row has since been detached from the trip", async () => {
    p.bed.findUnique.mockResolvedValue(bedOnOtherTrip({ tripId: MY_TRIP }));
    p.user.findUnique.mockResolvedValue(dbUser({ tripId: null }));

    const result = await claimBedSlot("bed-1");

    expect(result).toEqual({ error: "You're not on a trip yet." });
    expectNoWrites();
  });

  it("refuses a caller whose row no longer exists", async () => {
    p.bed.findUnique.mockResolvedValue(bedOnOtherTrip({ tripId: MY_TRIP }));
    p.user.findUnique.mockResolvedValue(null);

    const result = await claimBedSlot("bed-1");

    expect(result).toEqual({ error: "Sign in as a participant first." });
    expectNoWrites();
  });
});

describe("a legitimate claim still goes through", () => {
  it("claims a bed on the caller's own trip", async () => {
    p.bed.findUnique.mockResolvedValue(bedOnOtherTrip({ tripId: MY_TRIP, assignments: [] }));
    p.user.findUnique.mockResolvedValue(dbUser());

    const result = await claimBedSlot("bed-1");

    expect(result).toEqual({ success: true });
    expect(p.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("the capacity check happens inside the transaction", () => {
  it("rejects the claim when the last slot is taken between read and write", async () => {
    p.bed.findUnique.mockResolvedValue(bedOnOtherTrip({ tripId: MY_TRIP, assignments: [] }));
    p.user.findUnique.mockResolvedValue(dbUser());

    // Run the real transaction callback against a tx that reports the bed full,
    // which is what a racing claim looks like from inside.
    p.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        bedAssignment: {
          count: vi.fn().mockResolvedValue(2),
          deleteMany: vi.fn(),
          create: vi.fn(),
        },
      }),
    );

    const result = await claimBedSlot("bed-1");

    expect(result).toEqual({ error: "That bed is already full." });
  });
});

describe("the board is scoped to a trip", () => {
  it("stamps a new post with the author's trip", async () => {
    p.user.findUnique.mockResolvedValue(dbUser());

    const result = await postComment("hello");

    expect(result).toEqual({ success: true });
    expect(p.comment.create).toHaveBeenCalledWith({
      data: { tripId: MY_TRIP, userId: "me", body: "hello" },
    });
  });

  it("refuses a reaction on a post belonging to another trip", async () => {
    p.user.findUnique.mockResolvedValue(dbUser());
    p.comment.findUnique.mockResolvedValue({ tripId: OTHER_TRIP });

    const result = await toggleReaction("comment-1", "👍");

    expect(result).toEqual({ error: "That isn't on your trip." });
    expect(p.reaction.create).not.toHaveBeenCalled();
    expect(p.reaction.delete).not.toHaveBeenCalled();
  });
});
