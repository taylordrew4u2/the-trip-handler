import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import AxeBuilder from "@axe-core/playwright";
import { expectNoHorizontalOverflow, expectTouchTargets, isTouch } from "./helpers";

// 2×2 PNGs in two colors, so the uploads are distinct real images.
const png = (b64: string) => Buffer.from(b64, "base64");
const RED = png("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGP4z8AARAwQCgAf7gP9i18U1AAAAABJRU5ErkJggg==");
const BLUE = png("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAD0lEQVR4nGNgYPgPRmAKABf2A/1+6zfzAAAAAElFTkSuQmCC");

test("owner uploads several lodging photos at once, captions and reorders them", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone-390", "mutating flow runs once");
  test.setTimeout(90_000);
  page.setDefaultTimeout(15_000);
  const db = new PrismaClient();
  const suffix = `${Date.now()}-${testInfo.workerIndex}`;
  const password = await bcrypt.hash("e2e-photo-password", 4);
  const owner = await db.user.create({ data: { name: "Photo test organizer", email: `photo-owner-${suffix}@example.com`, password, status: "APPROVED" } });
  const trip = await db.trip.create({ data: { name: "Photo test trip", ownerId: owner.id } });
  try {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill(owner.email);
    await page.locator('input[type="password"]').fill("e2e-photo-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);
    await page.goto(`/dashboard/my-trips/${trip.id}`);

    // The invite panel sits at the top: a full link (backfilled for this token-less trip) and a trip code on demand.
    await expect(page.getByRole("heading", { name: "Add people to this trip" })).toBeVisible();
    await expect(page.locator("section[aria-labelledby=invite-heading] code").first()).toContainText("http://127.0.0.1:3222/join/");
    await expect(page.getByRole("link", { name: "Text it" })).toHaveAttribute("href", /^sms:/);
    await page.getByRole("button", { name: "Create a trip code" }).click();
    await expect(page.getByRole("button", { name: "Copy code" })).toBeVisible();
    await expect.poll(async () => (await db.trip.findUnique({ where: { id: trip.id } }))?.joinCode).toMatch(/^[A-Z2-9]{6,8}$/);

    // Picking files uploads them right away — no separate button.
    await page.getByLabel("Choose lodging photos").setInputFiles([
      { name: "kitchen.png", mimeType: "image/png", buffer: RED },
      { name: "porch.png", mimeType: "image/png", buffer: BLUE },
    ]);
    await expect(page.getByRole("status").filter({ hasText: "Added 2 photos" })).toBeVisible();
    await expect(page.getByLabel(/^Caption for photo \d$/)).toHaveCount(2);
    await expect(page.getByText("2 of 30 used", { exact: false })).toBeVisible();

    await page.getByLabel("Caption for photo 2").fill("The porch");
    await page.getByLabel("Caption for photo 2").press("Enter");
    await expect.poll(async () => (await db.lodgingPhoto.findMany({ where: { tripId: trip.id } })).some(p => p.caption === "The porch")).toBe(true);

    await page.getByRole("button", { name: "Move photo 2 earlier", exact: true }).click();
    await expect(page.getByLabel("Caption for photo 1")).toHaveValue("The porch");

    await expectNoHorizontalOverflow(page);
    if (await isTouch(page)) await expectTouchTargets(page);
    const { violations } = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations.map(v => v.id)).toEqual([]);

    await page.reload();
    await expect(page.getByLabel("Caption for photo 1")).toHaveValue("The porch");
  } finally {
    await db.storedFile.deleteMany({ where: { tripId: trip.id } });
    await db.lodgingPhoto.deleteMany({ where: { tripId: trip.id } });
    await db.trip.delete({ where: { id: trip.id } });
    await db.user.delete({ where: { id: owner.id } });
    await db.$disconnect();
  }
});
