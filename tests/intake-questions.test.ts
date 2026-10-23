import { describe, expect, it, vi, beforeEach } from "vitest";
import { defaultIntakeQuestions, intakeQuestions, fillIntakeAmounts, validateIntakeQuestions, visibleQuestions, readQuestionAnswers, readIntakeSnapshot, type IntakeQuestion } from "@/lib/intakeQuestions";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { trip: { findFirst: vi.fn(), update: vi.fn() } } }));
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { saveIntakeQuestions } from "@/app/actions/intakeQuestions";

const custom: IntakeQuestion = { id: "custom_question1", type: "text", label: "What should we bring?", section: "Packing", help: "", hidden: false, required: true, options: [] };
const minimal = () => [...defaultIntakeQuestions().filter(q => ["fullName", "phoneNumber"].includes(q.id)), custom];

function answers() { const fd = new FormData(); fd.set("fullName", "Guest"); fd.set("phoneNumber", "5551234567"); return fd; }

describe("editable intake questions", () => {
  it("keeps defaults valid and uses the trip's deposit in help and agreements", () => {
    expect(validateIntakeQuestions(defaultIntakeQuestions()).error).toBeUndefined();
    const qs = fillIntakeAmounts(intakeQuestions(null), 123);
    expect(qs.find(q => q.id === "maxBudget")?.help).toContain("$123.00");
    expect(qs.find(q => q.id === "securityDepositAcks")?.options[0].label).toContain("$123.00");
  });
  it("keeps the deposit live after an admin saves questions", () => {
    const qs = defaultIntakeQuestions();
    expect(fillIntakeAmounts(intakeQuestions(qs), 200).find(q => q.id === "maxBudget")?.help).toContain("$200.00");
  });
  it("honors hidden questions and disabled sections", () => {
    const qs = [...defaultIntakeQuestions(), { ...custom, hidden: true }];
    const visible = visibleQuestions(qs, ["payment", "social", "meals"]);
    expect(visible.some(q => q.id === "custom_question1" || q.id === "maxBudget" || q.id === "instagram")).toBe(false);
    expect(visible.find(q => q.id === "houseRulesAcks")?.options.some(o => o.value === "food")).toBe(false);
  });
  it.each(["fullName", "phoneNumber"])("keeps %s visible and required", id => {
    expect(validateIntakeQuestions(minimal().map(q => q.id === id ? { ...q, required: false } : q)).error).toMatch(/Name and phone/);
    expect(validateIntakeQuestions(minimal().filter(q => q.id !== id)).error).toMatch(/Name and phone/);
  });
  it("rejects duplicate IDs, unknown database fields, empty choices and changed built-in types", () => {
    expect(validateIntakeQuestions([...minimal(), custom]).error).toMatch(/unique/);
    expect(validateIntakeQuestions([...minimal(), { ...custom, id: "locked" }]).error).toMatch(/custom/);
    expect(validateIntakeQuestions(minimal().map(q => q.id === custom.id ? { ...q, type: "radio", options: [] } : q)).error).toMatch(/choice/);
    expect(validateIntakeQuestions(minimal().map(q => q.id === "phoneNumber" ? { ...q, type: "textarea" } : q)).error).toMatch(/type/);
  });
  it("enforces custom requirements on the server and ignores forged fields", () => {
    const fd = answers();
    fd.set("locked", "false"); fd.set("userId", "victim");
    expect(readQuestionAnswers(fd, minimal()).error).toContain(custom.label);
    fd.set(custom.id, "Blankets");
    const result = readQuestionAnswers(fd, minimal());
    expect(result.error).toBeNull();
    expect(result.answers).toEqual({ fullName: "Guest", phoneNumber: "5551234567", custom_question1: "Blankets" });
  });
  it("does not require a hidden or optional answer", () => {
    const qs = minimal().map(q => q.id === custom.id ? { ...q, hidden: true } : q);
    expect(readQuestionAnswers(answers(), visibleQuestions(qs, [])).error).toBeNull();
    expect(readQuestionAnswers(answers(), minimal().map(q => ({ ...q, required: false }))).error).toBeNull();
  });
  it("requires one selection for custom multiple choice, and all for agreement groups", () => {
    const q = { ...custom, type: "checks" as const, options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] };
    const fd = new FormData();
    expect(readQuestionAnswers(fd, [q]).error).toMatch(/at least one/);
    fd.append(`${q.id}[]`, "a");
    expect(readQuestionAnswers(fd, [q]).error).toBeNull();
    fd.append("houseRulesAcks[]", "a");
    expect(readQuestionAnswers(fd, [{ ...q, id: "houseRulesAcks" }]).error).toMatch(/every item/);
  });
  it("rejects invalid choice values and oversized responses", () => {
    const fd = new FormData();
    fd.set(custom.id, "forged");
    expect(readQuestionAnswers(fd, [{ ...custom, type: "radio", options: [{ value: "yes", label: "Yes" }] }]).error).toMatch(/listed answer/);
    fd.set(custom.id, "x".repeat(10001));
    expect(readQuestionAnswers(fd, [custom]).error).toMatch(/10,000/);
  });
  it("reads a submitted snapshot without consulting the changed template", () => {
    const snapshot = { questions: minimal(), answers: { fullName: "Guest", phoneNumber: "123", custom_question1: "Blankets" } };
    const copy = readIntakeSnapshot(JSON.parse(JSON.stringify(snapshot)));
    const changed = minimal(); changed[2] = { ...custom, label: "New wording" };
    expect(copy?.questions[2].label).toBe(custom.label);
    expect(copy?.answers.custom_question1).toBe("Blankets");
    expect(readIntakeSnapshot(null)).toBeNull();
  });
});

describe("saveIntakeQuestions authorization", () => {
  beforeEach(() => vi.resetAllMocks());
  it("requires a session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    expect(await saveIntakeQuestions("t1", minimal())).toHaveProperty("error");
    expect(prisma.trip.update).not.toHaveBeenCalled();
  });
  it("rejects another owner's trip", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "stranger" } });
    vi.mocked(prisma.trip.findFirst).mockResolvedValue(null);
    expect(await saveIntakeQuestions("t1", minimal())).toEqual({ error: "Not your trip." });
    expect(prisma.trip.update).not.toHaveBeenCalled();
  });
  it("saves only valid questions on the caller's trip", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "owner" } });
    vi.mocked(prisma.trip.findFirst).mockResolvedValue({ id: "t1" } as never);
    expect(await saveIntakeQuestions("t1", minimal())).toEqual({ success: true });
    expect(prisma.trip.update).toHaveBeenCalledWith({ where: { id: "t1", ownerId: "owner" }, data: { intakeQuestions: minimal() } });
  });
});
