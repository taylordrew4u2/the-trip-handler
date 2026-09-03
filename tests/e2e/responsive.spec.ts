import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  expectTouchTargets,
  isTouch,
  signIn,
} from "./helpers";

/**
 * The app has two audiences — the organizer running the trip and the member on
 * it — and both work from a phone. These tests walk each journey at every
 * viewport in `playwright.config.ts` and assert the two things that break first
 * on a small screen: content escaping the viewport, and controls too small to
 * hit with a thumb.
 */

const PUBLIC_PAGES = ["/", "/login", "/signup"];

const MEMBER_PAGES = [
  "/dashboard",
  "/dashboard/itinerary",
  "/dashboard/lodging",
  "/dashboard/roster",
  "/dashboard/sleeping",
  "/dashboard/meals",
  "/dashboard/board",
  "/dashboard/contributions",
  "/dashboard/expenses",
  "/dashboard/preferences",
  "/dashboard/profile",
  "/dashboard/payment",
  "/dashboard/intake",
];

const ORGANIZER_PAGES = ["/dashboard/my-trips"];

test.describe("public pages", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} fits the viewport`, async ({ page }) => {
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
      if (await isTouch(page)) await expectTouchTargets(page);
    });
  }
});

test.describe("member journey", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "member");
  });

  for (const path of MEMBER_PAGES) {
    test(`${path} fits the viewport`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status(), `${path} did not load`).toBeLessThan(400);
      await expectNoHorizontalOverflow(page);
      if (await isTouch(page)) await expectTouchTargets(page);
    });
  }
});

test.describe("organizer journey", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "organizer");
  });

  for (const path of ORGANIZER_PAGES) {
    test(`${path} fits the viewport`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status(), `${path} did not load`).toBeLessThan(400);
      await expectNoHorizontalOverflow(page);
      if (await isTouch(page)) await expectTouchTargets(page);
    });
  }

  test("the invite link and join code stay inside a narrow card", async ({ page }) => {
    await page.goto("/dashboard/my-trips");
    await expect(page.getByRole("button", { name: /copy link/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /copy code/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
