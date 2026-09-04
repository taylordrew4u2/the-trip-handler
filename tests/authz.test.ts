import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

/**
 * Direct tests for the guards in lib/authz.ts and lib/approval.ts.
 *
 * tests/member-authz.test.ts proves the actions call these; this proves the
 * guards themselves answer correctly, including the branches an action-level
 * test can't reach — the legacy ADMIN seat, a caller with no row at all.
 */

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique: vi.fn() } } }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import {
  isAuthzError,
  requireApprovedActor,
  requireApprovedMember,
  requireApprovedMemberOf,
  sessionUserId,
} from "@/lib/authz";
import { getUserStatus, isApproved } from "@/lib/approval";

const session = getServerSession as unknown as Mock;
const p = prisma as unknown as { user: { findUnique: Mock } };

beforeEach(() => {
  vi.clearAllMocks();
});

function signedInAs(user: Record<string, unknown> | null) {
  session.mockResolvedValue(user ? { user } : null);
}

describe("sessionUserId", () => {
  it("returns the id of a signed-in participant", async () => {
    signedInAs({ id: "u1", role: "PARTICIPANT" });
    expect(await sessionUserId()).toBe("u1");
  });

  it("returns null when nobody is signed in", async () => {
    signedInAs(null);
    expect(await sessionUserId()).toBeNull();
  });

  it("returns null for the legacy admin seat, which has no member powers", async () => {
    signedInAs({ id: "admin", role: "ADMIN" });
    expect(await sessionUserId()).toBeNull();
  });

  it("returns null for a participant id carrying the ADMIN role", async () => {
    signedInAs({ id: "u1", role: "ADMIN" });
    expect(await sessionUserId()).toBeNull();
  });
});

describe("requireApprovedMember", () => {
  it("returns the caller and the trip read from their row", async () => {
    signedInAs({ id: "u1", role: "PARTICIPANT" });
    p.user.findUnique.mockResolvedValue({
      status: "PENDING_PAYMENT",
      tripId: "t1",
      role: "PARTICIPANT",
    });

    const result = await requireApprovedMember();

    expect(result).toEqual({ id: "u1", tripId: "t1" });
  });

  it("ignores the session's claims and uses the row", async () => {
    // The session says APPROVED; the row says otherwise, and the row wins.
    signedInAs({ id: "u1", role: "PARTICIPANT", status: "APPROVED" });
    p.user.findUnique.mockResolvedValue({ status: "PENDING", tripId: "t1", role: "PARTICIPANT" });

    expect(await requireApprovedMember()).toEqual({ error: "You need to be approved first." });
  });

  it("rejects a caller with no trip", async () => {
    signedInAs({ id: "u1", role: "PARTICIPANT" });
    p.user.findUnique.mockResolvedValue({ status: "APPROVED", tripId: null, role: "PARTICIPANT" });

    expect(await requireApprovedMember()).toEqual({ error: "You're not on a trip yet." });
  });

  it("rejects a caller whose row is gone", async () => {
    signedInAs({ id: "u1", role: "PARTICIPANT" });
    p.user.findUnique.mockResolvedValue(null);

    expect(await requireApprovedMember()).toEqual({ error: "Sign in as a participant first." });
  });

  it("rejects a row that turned out to be an admin", async () => {
    signedInAs({ id: "u1", role: "PARTICIPANT" });
    p.user.findUnique.mockResolvedValue({ status: "APPROVED", tripId: "t1", role: "ADMIN" });

    expect(await requireApprovedMember()).toEqual({ error: "Sign in as a participant first." });
  });
});

describe("requireApprovedMemberOf", () => {
  beforeEach(() => {
    signedInAs({ id: "u1", role: "PARTICIPANT" });
    p.user.findUnique.mockResolvedValue({ status: "APPROVED", tripId: "t1", role: "PARTICIPANT" });
  });

  it("accepts the caller's own trip", async () => {
    expect(await requireApprovedMemberOf("t1")).toEqual({ id: "u1", tripId: "t1" });
  });

  it("rejects another trip", async () => {
    expect(await requireApprovedMemberOf("t2")).toEqual({ error: "That isn't on your trip." });
  });

  it("rejects a missing trip id rather than falling through", async () => {
    // A record with a null tripId must not become "matches everything".
    expect(await requireApprovedMemberOf(null)).toEqual({ error: "That isn't on your trip." });
    expect(await requireApprovedMemberOf(undefined)).toEqual({ error: "That isn't on your trip." });
  });

  it("passes an authentication failure straight through", async () => {
    signedInAs(null);
    expect(await requireApprovedMemberOf("t1")).toEqual({
      error: "Sign in as a participant first.",
    });
  });
});

describe("requireApprovedActor", () => {
  it("accepts an approved participant and reports their trip", async () => {
    signedInAs({ id: "u1", role: "PARTICIPANT" });
    p.user.findUnique.mockResolvedValue({ status: "APPROVED", tripId: "t1", role: "PARTICIPANT" });

    expect(await requireApprovedActor()).toEqual({ id: "u1", isAdmin: false, tripId: "t1" });
  });

  it("accepts an admin with a row, regardless of status", async () => {
    signedInAs({ id: "a1", role: "ADMIN" });
    p.user.findUnique.mockResolvedValue({ status: "CANCELLED", tripId: null, role: "ADMIN" });

    expect(await requireApprovedActor()).toEqual({ id: "a1", isAdmin: true, tripId: null });
  });

  it("accepts the legacy admin seat, which has no row to read", async () => {
    signedInAs({ id: "admin", role: "ADMIN" });
    p.user.findUnique.mockResolvedValue(null);

    expect(await requireApprovedActor()).toEqual({ id: "admin", isAdmin: true, tripId: null });
  });

  it("rejects a non-admin whose row is gone", async () => {
    signedInAs({ id: "u1", role: "PARTICIPANT" });
    p.user.findUnique.mockResolvedValue(null);

    expect(await requireApprovedActor()).toEqual({ error: "Sign in first." });
  });

  it("rejects an unapproved participant", async () => {
    signedInAs({ id: "u1", role: "PARTICIPANT" });
    p.user.findUnique.mockResolvedValue({ status: "PENDING", tripId: "t1", role: "PARTICIPANT" });

    expect(await requireApprovedActor()).toEqual({ error: "You need to be approved first." });
  });

  it("rejects when nobody is signed in", async () => {
    signedInAs(null);
    expect(await requireApprovedActor()).toEqual({ error: "Sign in first." });
  });
});

describe("isAuthzError", () => {
  it("distinguishes a failure from a result", () => {
    expect(isAuthzError({ error: "nope" })).toBe(true);
    expect(isAuthzError({ id: "u1", tripId: "t1" })).toBe(false);
  });
});

describe("getUserStatus", () => {
  it("reads the status from the database, not the session", async () => {
    signedInAs({ id: "u1", role: "PARTICIPANT", status: "APPROVED" });
    p.user.findUnique.mockResolvedValue({ status: "CANCELLED" });

    expect(await getUserStatus()).toBe("CANCELLED");
  });

  it("returns null when nobody is signed in, without querying", async () => {
    signedInAs(null);

    expect(await getUserStatus()).toBeNull();
    expect(p.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the row is gone", async () => {
    signedInAs({ id: "u1", role: "PARTICIPANT" });
    p.user.findUnique.mockResolvedValue(null);

    expect(await getUserStatus()).toBeNull();
  });
});

describe("isApproved", () => {
  it("accepts every state that follows approval", () => {
    for (const status of ["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"]) {
      expect(isApproved(status)).toBe(true);
    }
  });

  it("rejects everything else, including absent values", () => {
    for (const status of ["PENDING", "CANCELLED", "", null, undefined]) {
      expect(isApproved(status)).toBe(false);
    }
  });
});
