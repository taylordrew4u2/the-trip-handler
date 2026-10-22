import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { HOUSE_RULES, MATERIAL_ACKS, DEPOSIT_ACKS, intakeError, readIntake } from "@/lib/guestForm";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/resend", () => ({ notifyAdmin: vi.fn(), sendFormUnlockedEmail: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    trip: { findUnique: vi.fn() },
    guestForm: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { submitGuestForm, unlockGuestForm } from "@/app/actions/guestForm";

const session = getServerSession as unknown as Mock;
const p = prisma as unknown as {
  user: { findUnique: Mock };
  trip: { findUnique: Mock };
  guestForm: { findUnique: Mock; upsert: Mock; update: Mock };
};

/** A complete, valid submission for a trip with every section on. */
function fullForm(): FormData {
  const fd = new FormData();
  for (const k of [
    "fullName", "stageName", "phoneNumber", "pronouns", "maxBudget", "shareBed", "medicalConditions",
    "refrigeratedMeds", "emergencyMedItem", "mobilityNeeds", "cannotDo", "safetyNotes", "instagram", "tiktok",
    "otherHandles", "comfortGroupPhotos", "comfortGroupVideos", "comfortTagged", "comfortPlannedContent",
    "activitiesOtherText", "activitiesOptOut", "structurePref", "finalNotes", "whatWouldMakeFun",
  ]) fd.set(k, "N/A");
  fd.set("age21Confirmed", "on");
  fd.set("substanceFreeAck", "on");
  for (const v of MATERIAL_ACKS) fd.append("jokeProtectionAcks[]", v);
  for (const v of DEPOSIT_ACKS) fd.append("securityDepositAcks[]", v);
  for (const r of HOUSE_RULES) fd.append("houseRulesAcks[]", r.value);
  return fd;
}

describe("guest form rules", () => {
  it("accepts a complete form", () => {
    expect(intakeError(readIntake(fullForm(), []), [])).toBeNull();
  });

  it("requires every visible question", () => {
    const fd = fullForm();
    fd.delete("medicalConditions");
    expect(intakeError(readIntake(fd, []), [])).toMatch(/Medical conditions/);
  });

  it("doesn't ask about switched-off things", () => {
    const fd = new FormData();
    for (const k of [
      "fullName", "stageName", "phoneNumber", "pronouns", "medicalConditions", "refrigeratedMeds",
      "emergencyMedItem", "mobilityNeeds", "cannotDo", "safetyNotes", "finalNotes", "whatWouldMakeFun",
    ]) fd.set(k, "N/A");
    for (const r of HOUSE_RULES.filter((r) => r.value !== "food" && r.value !== "alcohol")) {
      fd.append("houseRulesAcks[]", r.value);
    }
    const off = ["payment", "sleeping", "itinerary", "meals", "sober", "age21", "social", "material"];
    const data = readIntake(fd, off);
    expect(intakeError(data, off)).toBeNull();
    expect(data).not.toHaveProperty("maxBudget");
    expect(data).not.toHaveProperty("substanceFreeAck");
  });

  it("ignores fields that aren't questions", () => {
    const fd = fullForm();
    fd.set("userId", "victim");
    fd.set("locked", "false");
    fd.set("preferencesSubmittedAt", "2020-01-01");
    fd.append("dietaryRestrictions[]", "vegan");
    const data = readIntake(fd, []);
    expect(data).not.toHaveProperty("userId");
    expect(data).not.toHaveProperty("locked");
    expect(data).not.toHaveProperty("preferencesSubmittedAt");
    expect(data).not.toHaveProperty("dietaryRestrictions");
  });
});

describe("submitGuestForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.mockResolvedValue({ user: { id: "u1" } });
    p.guestForm.findUnique.mockResolvedValue(null);
    p.trip.findUnique.mockResolvedValue({ owner: { email: "owner@example.com" } });
  });

  it("needs a trip first", async () => {
    p.user.findUnique.mockResolvedValue({ id: "u1", name: "A", email: "a@x", trip: null });
    expect(await submitGuestForm(fullForm())).toEqual({ error: "Join a trip with an invite link or code first." });
    expect(p.guestForm.upsert).not.toHaveBeenCalled();
  });

  it("never writes another user's id", async () => {
    p.user.findUnique.mockResolvedValue({ id: "u1", name: "A", email: "a@x", trip: { id: "t1", disabledSections: [] } });
    const fd = fullForm();
    fd.set("userId", "victim");
    expect(await submitGuestForm(fd)).toEqual({ success: true });
    const arg = p.guestForm.upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ userId: "u1" });
    expect(arg.update).not.toHaveProperty("userId");
    expect(arg.create.userId).toBe("u1");
  });
});

describe("unlockGuestForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets the trip's owner unlock", async () => {
    session.mockResolvedValue({ user: { id: "owner" } });
    p.user.findUnique.mockResolvedValue({ trip: { id: "t1", ownerId: "owner" }, name: "A", email: "a@x" });
    p.guestForm.findUnique.mockResolvedValue({ locked: true });
    expect(await unlockGuestForm("u1")).toEqual({ success: true });
    expect(p.guestForm.update).toHaveBeenCalled();
  });

  it("refuses anyone else", async () => {
    session.mockResolvedValue({ user: { id: "stranger" } });
    p.user.findUnique.mockResolvedValue({ trip: { id: "t1", ownerId: "owner" } });
    expect(await unlockGuestForm("u1")).toEqual({ error: "Not your trip." });
    expect(p.guestForm.update).not.toHaveBeenCalled();
  });
});
