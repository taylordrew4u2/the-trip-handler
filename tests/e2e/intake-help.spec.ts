import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import AxeBuilder from "@axe-core/playwright";
import { expectNoHorizontalOverflow, expectTouchTargets, isTouch } from "./helpers";
import { defaultIntakeQuestions } from "../../lib/intakeQuestions";

test("help is available without signing in and can be searched", async ({ page }) => {
  await page.goto("/help");
  await expect(page.getByRole("heading", { name: "Help and FAQ", exact: true })).toBeVisible();
  await page.getByLabel("Search help").fill("roster");
  await expect(page.getByText("Does changing roster spots change the price?", { exact: true })).toBeVisible();
  await page.getByLabel("Search help").fill("zzzz-no-result");
  await expect(page.getByRole("status")).toContainText("0 answers found");
  await page.getByRole("link", { name: "Guest form and answers", exact: true }).click();
  await expect(page.getByLabel("Search help")).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Guest form and answers", exact: true })).toBeVisible();
});

test("owner edits questions, guest submits, and later edits preserve the original answer", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== "phone-390", "mutating flow runs once");
  test.setTimeout(90_000);
  // These fixtures are independent of the seeded demo and other parallel tests.
  const db = new PrismaClient();
  const suffix = `${Date.now()}-${testInfo.workerIndex}`;
  const password = await bcrypt.hash("e2e-intake-password", 4);
  const owner = await db.user.create({ data: { name: "Intake test organizer", email: `intake-owner-${suffix}@example.com`, password, status: "APPROVED" } });
  const trip = await db.trip.create({ data: { name: "Intake question test", ownerId: owner.id, intakeQuestions: defaultIntakeQuestions().filter(q => ["fullName", "phoneNumber"].includes(q.id)) } });
  const guest = await db.user.create({ data: { name: "Intake test guest", email: `intake-guest-${suffix}@example.com`, password, tripId: trip.id, status: "PENDING" } });
  const guestContext = await browser.newContext();
  try {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(owner.email);
    await page.locator('input[type="password"]').fill("e2e-intake-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);
    await page.goto(`/dashboard/my-trips/${trip.id}/intake`);
    await page.getByRole("button", { name: "Add short answer", exact: true }).click();
    const details = page.locator("details").filter({ has: page.locator("summary", { hasText: "New question" }) });
    await details.locator("summary").click();
    await details.getByLabel("Question text", { exact: true }).fill("What can you bring for the group?");
    await details.getByLabel("Help text (optional)").fill("A short answer is enough.");
    await details.getByLabel("Required", { exact: true }).check();
    await expectNoHorizontalOverflow(page);
    if (await isTouch(page)) await expectTouchTargets(page);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations.map(v => v.id)).toEqual([]);
    await page.getByRole("button", { name: "Save questions", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Questions saved");
    await page.getByRole("button", { name: "Preview guest form", exact: true }).click();
    await expect(page.getByLabel("What can you bring for the group?", { exact: false })).toBeVisible();
    await page.reload();
    await expect(page.locator("summary").filter({ hasText: "What can you bring for the group?" })).toBeVisible();

    const guestPage = await guestContext.newPage();
    await guestPage.goto(new URL("/login", page.url()).toString());
    await guestPage.locator('input[type="email"]').fill(guest.email);
    await guestPage.locator('input[type="password"]').fill("e2e-intake-password");
    await guestPage.getByRole("button", { name: /sign in/i }).click();
    await guestPage.waitForURL(/\/dashboard/);
    await guestPage.goto(new URL("/dashboard/intake", page.url()).toString());
    await guestPage.getByLabel("Phone number", { exact: false }).fill("5551234567");
    await guestPage.getByLabel("What can you bring for the group?", { exact: false }).fill("Extra blankets");
    await guestPage.getByRole("button", { name: "Submit for review", exact: true }).click();
    await expect.poll(async () => db.guestForm.count({ where: { userId: guest.id, locked: true } })).toBe(1);
    await page.goto(`/dashboard/my-trips/${trip.id}/applicants/${guest.id}`);
    await expect(page.getByText("What can you bring for the group?", { exact: true })).toBeVisible();
    await expect(page.getByText("Extra blankets", { exact: true })).toBeVisible();

    await page.goto(`/dashboard/my-trips/${trip.id}/intake`);
    const edited = page.locator("details").filter({ has: page.locator("summary", { hasText: "What can you bring for the group?" }) });
    await edited.locator("summary").click();
    await edited.getByLabel("Question text", { exact: true }).fill("Changed question for future guests");
    await page.getByRole("button", { name: "Save questions", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Questions saved");
    await page.goto(`/dashboard/my-trips/${trip.id}/applicants/${guest.id}`);
    await expect(page.getByText("What can you bring for the group?", { exact: true })).toBeVisible();
    await expect(page.getByText("Extra blankets", { exact: true })).toBeVisible();
    await guestPage.goto(new URL("/dashboard/intake", page.url()).toString());
    await expect(guestPage.getByLabel("What can you bring for the group?", { exact: false })).toHaveValue("Extra blankets");
    await expect(guestPage.getByLabel("What can you bring for the group?", { exact: false })).toBeDisabled();
  } finally {
    await guestContext.close();
    await db.guestForm.deleteMany({ where: { userId: guest.id } });
    await db.user.deleteMany({ where: { id: guest.id } });
    await db.trip.delete({ where: { id: trip.id } });
    await db.user.delete({ where: { id: owner.id } });
    await db.$disconnect();
  }
});
