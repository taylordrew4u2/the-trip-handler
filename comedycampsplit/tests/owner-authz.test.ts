import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

// Verify the ownership boundary across the whole owner toolset: every owner
// action must reject a caller who isn't signed in or doesn't own the trip,
// before mutating anything.
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/resend", () => ({
  sendApprovalEmail: vi.fn(),
  sendRejectionEmail: vi.fn(),
  sendTripLockedEmail: vi.fn(),
}));
vi.mock("@/lib/blob", () => ({ deleteBlob: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    trip: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    contribution: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    userContribution: { deleteMany: vi.fn() },
    expense: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(), aggregate: vi.fn() },
    bed: { findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), createMany: vi.fn(), delete: vi.fn() },
    bedAssignment: { deleteMany: vi.fn() },
    groceryItem: { findUnique: vi.fn() },
    mealSlot: { findUnique: vi.fn() },
    mealPlanPhase: { upsert: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import {
  updateMyTripPrice,
  lockMyTripPrice,
  unlockMyTripPrice,
  unlockMyTrip,
  addTripContribution,
  deleteTripContribution,
  approveTripExpense,
  deleteTripExpense,
  addTripBed,
  deleteTripBed,
  seedDefaultTripBeds,
} from "@/app/actions/trips";

const session = getServerSession as unknown as Mock;
const p = prisma as unknown as {
  trip: { findFirst: Mock };
  contribution: { findUnique: Mock };
  expense: { findUnique: Mock };
  bed: { findUnique: Mock };
};

beforeEach(() => {
  vi.clearAllMocks();
  // Signed-in, but never the owner: ownership lookups resolve to null.
  session.mockResolvedValue({ user: { id: "stranger" } });
  p.trip.findFirst.mockResolvedValue(null);
  p.contribution.findUnique.mockResolvedValue({ tripId: "t1" });
  p.expense.findUnique.mockResolvedValue({ tripId: "t1", receiptUrl: null });
  p.bed.findUnique.mockResolvedValue({ tripId: "t1" });
});

describe("owner actions reject non-owners", () => {
  const cases: [string, () => Promise<{ error?: string } | void>][] = [
    ["updateMyTripPrice", () => updateMyTripPrice("t1", "housing", 100)],
    ["lockMyTripPrice", () => lockMyTripPrice("t1", "housing")],
    ["unlockMyTripPrice", () => unlockMyTripPrice("t1", "housing")],
    ["unlockMyTrip", () => unlockMyTrip("t1")],
    ["addTripContribution", () => addTripContribution("t1", "Ice")],
    ["deleteTripContribution", () => deleteTripContribution("c1")],
    ["approveTripExpense", () => approveTripExpense("e1")],
    ["deleteTripExpense", () => deleteTripExpense("e1")],
    ["addTripBed", () => addTripBed("t1", { label: "Queen", type: "DOUBLE", womenOnly: false, count: 1 })],
    ["deleteTripBed", () => deleteTripBed("b1")],
    ["seedDefaultTripBeds", () => seedDefaultTripBeds("t1")],
  ];

  it.each(cases)("%s returns 'Not your trip'", async (_name, run) => {
    const result = await run();
    expect((result as { error?: string }).error).toBe("Not your trip.");
  });
});

describe("owner actions require a session", () => {
  beforeEach(() => session.mockResolvedValue(null));

  it("updateMyTripPrice rejects when signed out", async () => {
    expect(await updateMyTripPrice("t1", "housing", 100)).toEqual({ error: "Sign in first." });
  });

  it("addTripBed rejects when signed out", async () => {
    expect(await addTripBed("t1", { label: "x", type: "DOUBLE", womenOnly: false, count: 1 })).toEqual({
      error: "Sign in first.",
    });
  });
});
