import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

// Mock the boundaries the owner actions touch so we can exercise their
// authorization logic without a database, session, or email provider.
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
    trip: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { createMyTrip, updateMyTrip, applyToTrip } from "@/app/actions/trips";

const session = getServerSession as unknown as Mock;
const tripFindFirst = prisma.trip.findFirst as unknown as Mock;
const tripFindUnique = prisma.trip.findUnique as unknown as Mock;
const userFindUnique = prisma.user.findUnique as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createMyTrip", () => {
  it("requires a signed-in user", async () => {
    session.mockResolvedValue(null);
    expect(await createMyTrip("Tahoe")).toEqual({ error: "Sign in to create a trip." });
  });

  it("ignores the synthetic env-admin id", async () => {
    session.mockResolvedValue({ user: { id: "admin" } });
    expect(await createMyTrip("Tahoe")).toEqual({ error: "Sign in to create a trip." });
  });
});

describe("updateMyTrip", () => {
  it("rejects editing a trip the user doesn't own", async () => {
    session.mockResolvedValue({ user: { id: "u1" } });
    tripFindFirst.mockResolvedValue(null); // ownedTrip() finds nothing
    expect(await updateMyTrip("tripX", { name: "x" })).toEqual({ error: "Not your trip." });
  });
});

describe("applyToTrip", () => {
  it("won't move a member off a trip they're still on", async () => {
    session.mockResolvedValue({ user: { id: "u1" } });
    tripFindUnique.mockResolvedValue({ id: "tripB", isApplicationOpen: true, ownerId: "owner1" });
    userFindUnique.mockResolvedValue({ tripId: "tripA", status: "APPROVED" });

    const result = await applyToTrip("invite-token");
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toMatch(/already on another trip/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("blocks the owner from applying to their own trip", async () => {
    session.mockResolvedValue({ user: { id: "owner1" } });
    tripFindUnique.mockResolvedValue({ id: "tripB", isApplicationOpen: true, ownerId: "owner1" });

    const result = await applyToTrip("invite-token");
    expect((result as { error: string }).error).toMatch(/you own this trip/i);
  });

  it("rejects a closed or unknown invite", async () => {
    session.mockResolvedValue({ user: { id: "u1" } });
    tripFindUnique.mockResolvedValue(null);
    expect(await applyToTrip("bad")).toEqual({
      error: "This invite isn't accepting applications.",
    });
  });
});
