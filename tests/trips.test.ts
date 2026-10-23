import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { Prisma } from "@prisma/client";

// Mock the boundaries the owner actions touch so we can exercise their
// authorization logic without a database, session, or email provider.
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/resend", () => ({
  sendApprovalEmail: vi.fn(),
  sendRejectionEmail: vi.fn(),
  sendTripLockedEmail: vi.fn(),
}));
vi.mock("@/lib/files", () => ({ deleteUpload: vi.fn(), saveUpload: vi.fn(), safeUploadType: () => "image/png", MAX_UPLOAD_BYTES: 4194304 }));
vi.mock("@/lib/db", () => ({
  prisma: {
    trip: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import {
  updateMyTripRosterCapacity,
  updateMyTripCostShareDivisor,
  lockMyTripPrice,
  createMyTrip,
  updateMyTrip,
  applyToTrip,
  unlockMyTrip,
  findTripByCode,
  generateMyTripJoinCode,
} from "@/app/actions/trips";

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

  it("blocks a previously-rejected applicant from re-applying", async () => {
    session.mockResolvedValue({ user: { id: "u1" } });
    tripFindUnique.mockResolvedValue({ id: "tripA", isApplicationOpen: true, ownerId: "owner1" });
    userFindUnique.mockResolvedValue({ tripId: "tripA", status: "CANCELLED", rejectedTripId: "tripA" });

    const result = await applyToTrip("invite-token");
    expect((result as { error: string }).error).toMatch(/declined/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects a closed or unknown invite", async () => {
    session.mockResolvedValue({ user: { id: "u1" } });
    tripFindUnique.mockResolvedValue(null);
    expect(await applyToTrip("bad")).toEqual({
      error: "This invite isn't accepting applications.",
    });
  });
});

describe("findTripByCode", () => {
  it("rejects an empty code", async () => {
    expect(await findTripByCode("   ")).toEqual({ error: "Enter a trip code." });
  });

  it("normalizes the code to uppercase before looking it up", async () => {
    tripFindUnique.mockResolvedValue({ id: "t1", isApplicationOpen: true, inviteToken: "tok" });
    await findTripByCode("k7p4qx");
    expect(tripFindUnique).toHaveBeenCalledWith({ where: { joinCode: "K7P4QX" } });
  });

  it("reports an unknown code", async () => {
    tripFindUnique.mockResolvedValue(null);
    expect(await findTripByCode("ZZZZZZ")).toEqual({ error: "No trip matches that code." });
  });

  it("won't hand off a trip that's closed to applications", async () => {
    tripFindUnique.mockResolvedValue({ id: "t1", isApplicationOpen: false, inviteToken: "tok" });
    const result = await findTripByCode("K7P4QX");
    expect((result as { error: string }).error).toMatch(/isn't accepting applications/i);
  });

  it("returns the invite token for the apply flow when open", async () => {
    tripFindUnique.mockResolvedValue({ id: "t1", isApplicationOpen: true, inviteToken: "tok" });
    expect(await findTripByCode("K7P4QX")).toEqual({ success: true, token: "tok" });
    expect(prisma.trip.update).not.toHaveBeenCalled();
  });

  it("backfills a missing invite token so the apply page has a URL", async () => {
    tripFindUnique.mockResolvedValue({ id: "t1", isApplicationOpen: true, inviteToken: null });
    const result = await findTripByCode("K7P4QX");
    expect(prisma.trip.update).toHaveBeenCalledTimes(1);
    expect((result as { success: boolean; token: string }).token).toMatch(/^[0-9a-f]{24}$/);
  });
});

describe("generateMyTripJoinCode", () => {
  it("requires a signed-in user", async () => {
    session.mockResolvedValue(null);
    expect(await generateMyTripJoinCode("t1")).toEqual({ error: "Sign in first." });
  });

  it("rejects a trip the user doesn't own", async () => {
    session.mockResolvedValue({ user: { id: "u1" } });
    tripFindFirst.mockResolvedValue(null); // ownedTrip() finds nothing
    expect(await generateMyTripJoinCode("t1")).toEqual({ error: "Not your trip." });
    expect(prisma.trip.update).not.toHaveBeenCalled();
  });

  it("issues a code from the unambiguous alphabet for an owned trip", async () => {
    session.mockResolvedValue({ user: { id: "owner1" } });
    tripFindFirst.mockResolvedValue({ id: "t1", ownerId: "owner1" }); // ownedTrip
    tripFindUnique.mockResolvedValue(null); // no collision
    const result = (await generateMyTripJoinCode("t1")) as { success: boolean; joinCode: string };
    expect(result.success).toBe(true);
    // 6 chars, uppercase, no 0/O/1/I/L.
    expect(result.joinCode).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    expect(prisma.trip.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { joinCode: result.joinCode },
    });
  });

  it("retries when the update hits a unique-constraint race", async () => {
    session.mockResolvedValue({ user: { id: "owner1" } });
    tripFindFirst.mockResolvedValue({ id: "t1", ownerId: "owner1" });
    tripFindUnique.mockResolvedValue(null);
    (prisma.trip.update as unknown as Mock)
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("unique constraint failed", {
          code: "P2002",
          clientVersion: "test",
        }),
      )
      .mockResolvedValueOnce({ id: "t1" });

    const result = (await generateMyTripJoinCode("t1")) as { success: boolean; joinCode: string };
    expect(result.success).toBe(true);
    expect(prisma.trip.update).toHaveBeenCalledTimes(2);
  });

  it("falls back to an 8-character code and still checks uniqueness", async () => {
    session.mockResolvedValue({ user: { id: "owner1" } });
    tripFindFirst.mockResolvedValue({ id: "t1", ownerId: "owner1" });
    tripFindUnique
      .mockResolvedValueOnce({ id: "taken-1" })
      .mockResolvedValueOnce({ id: "taken-2" })
      .mockResolvedValueOnce({ id: "taken-3" })
      .mockResolvedValueOnce({ id: "taken-4" })
      .mockResolvedValueOnce({ id: "taken-5" })
      .mockResolvedValueOnce({ id: "taken-6" })
      .mockResolvedValueOnce(null);
    (prisma.trip.update as unknown as Mock).mockResolvedValue({ id: "t1" });

    const result = (await generateMyTripJoinCode("t1")) as { success: boolean; joinCode: string };
    expect(result.success).toBe(true);
    expect(result.joinCode).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    expect(tripFindUnique).toHaveBeenCalledTimes(7);
  });
});

describe("unlockMyTrip", () => {
  it("refuses to reopen prices once a member has paid", async () => {
    session.mockResolvedValue({ user: { id: "owner1" } });
    tripFindFirst.mockResolvedValue({ id: "t1", ownerId: "owner1" }); // ownedTrip
    (prisma.user.count as unknown as Mock).mockResolvedValue(1); // a CONFIRMED_PAID member
    expect(await unlockMyTrip("t1")).toEqual({
      error: "Can't change prices — members have already paid.",
    });
    expect(prisma.trip.update).not.toHaveBeenCalled();
  });
});

describe("admin cost split", () => {
  it("requires sign-in", async () => {
    session.mockResolvedValue(null);
    expect(await updateMyTripCostShareDivisor("t1", 7)).toEqual({ error: "Sign in first." });
    expect(prisma.trip.updateMany).not.toHaveBeenCalled();
  });

  it("rejects another owner's trip", async () => {
    session.mockResolvedValue({ user: { id: "other" } });
    tripFindFirst.mockResolvedValue(null);
    expect(await updateMyTripCostShareDivisor("t1", 7)).toEqual({ error: "Not your trip." });
    expect(prisma.trip.updateMany).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, NaN, Infinity, 2147483648])("rejects invalid split %s", async (value) => {
    session.mockResolvedValue({ user: { id: "owner1" } });
    tripFindFirst.mockResolvedValue({ id: "t1", isLocked: false });
    expect(await updateMyTripCostShareDivisor("t1", value)).toHaveProperty("error");
    expect(prisma.trip.updateMany).not.toHaveBeenCalled();
  });

  it("requires unlocking before changing the split", async () => {
    session.mockResolvedValue({ user: { id: "owner1" } });
    tripFindFirst.mockResolvedValue({ id: "t1", isLocked: true });
    expect(await updateMyTripCostShareDivisor("t1", 7)).toHaveProperty("error");
    expect(prisma.trip.updateMany).not.toHaveBeenCalled();
  });

  it.each([1, 7, 20])("saves the owner's %i-way split", async (divisor) => {
    session.mockResolvedValue({ user: { id: "owner1" } });
    tripFindFirst.mockResolvedValue({ id: "t1", isLocked: false });
    (prisma.trip.updateMany as unknown as Mock).mockResolvedValue({ count: 1 });
    expect(await updateMyTripCostShareDivisor("t1", divisor)).toEqual({ success: true });
    expect(prisma.trip.updateMany).toHaveBeenCalledWith({
      where: { id: "t1", ownerId: "owner1", isLocked: false },
      data: { costShareDivisor: divisor },
    });
  });

  it("doesn't change a trip locked concurrently", async () => {
    session.mockResolvedValue({ user: { id: "owner1" } });
    tripFindFirst.mockResolvedValue({ id: "t1", isLocked: false });
    (prisma.trip.updateMany as unknown as Mock).mockResolvedValue({ count: 0 });
    expect(await updateMyTripCostShareDivisor("t1", 7)).toHaveProperty("error");
  });

  it("finalizes using the saved split rather than ten", async () => {
    session.mockResolvedValue({ user: { id: "owner1" } });
    tripFindFirst.mockResolvedValue({ id: "t1", housingPrice: 5600 });
    tripFindUnique.mockResolvedValue({
      id: "t1", costShareDivisor: 7, isLocked: false,
      housingPrice: 5600, housingLocked: true,
      disabledSections: ["meals", "transport"],
    });
    // No claim means no participant updates or email side effects in this test.
    (prisma.trip.updateMany as unknown as Mock).mockResolvedValue({ count: 0 });
    await lockMyTripPrice("t1", "housing");
    expect(prisma.trip.updateMany).toHaveBeenCalledWith({
      where: { id: "t1", isLocked: false, costShareDivisor: 7 },
      data: { finalPrice: 800, isLocked: true, lockedAt: expect.any(Date) },
    });
  });
});

describe("admin roster spots", () => {
  it("requires sign-in", async () => {
    session.mockResolvedValue(null);
    expect(await updateMyTripRosterCapacity("t1", 8)).toEqual({ error: "Sign in first." });
    expect(prisma.trip.update).not.toHaveBeenCalled();
  });

  it("rejects another owner's trip", async () => {
    session.mockResolvedValue({ user: { id: "other" } });
    tripFindFirst.mockResolvedValue(null);
    expect(await updateMyTripRosterCapacity("t1", 8)).toEqual({ error: "Not your trip." });
    expect(prisma.trip.update).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, NaN, Infinity, 1001])("rejects invalid roster count %s", async (capacity) => {
    session.mockResolvedValue({ user: { id: "owner1" } });
    tripFindFirst.mockResolvedValue({ id: "t1" });
    expect(await updateMyTripRosterCapacity("t1", capacity)).toHaveProperty("error");
    expect(prisma.trip.update).not.toHaveBeenCalled();
  });

  it.each([1, 8, 20, 1000])("saves %i roster spots independently of locked pricing", async (capacity) => {
    session.mockResolvedValue({ user: { id: "owner1" } });
    tripFindFirst.mockResolvedValue({ id: "t1", isLocked: true, costShareDivisor: 7 });
    expect(await updateMyTripRosterCapacity("t1", capacity)).toEqual({ success: true });
    expect(prisma.trip.update).toHaveBeenCalledWith({
      where: { id: "t1", ownerId: "owner1" }, data: { rosterCapacity: capacity },
    });
  });
});
