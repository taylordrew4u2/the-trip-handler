import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * The member area has thirteen destinations. Wide screens show them inline;
 * narrower ones collapse to the current page plus a menu. These tests pin the
 * behaviour that makes the collapsed form usable — it must open, say where you
 * are, survive the back button, and close on Escape.
 */

const MENU_TOGGLE = "nav button[aria-expanded]";

/** The inline row only fits past this width; below it the menu is the nav. */
const INLINE_NAV_MIN_WIDTH = 1536;

test.beforeEach(async ({ page }) => {
  await signIn(page, "member");
});

test("every destination is reachable at this size", async ({ page }, testInfo) => {
  await page.goto("/dashboard");
  const width = page.viewportSize()?.width ?? 0;

  if (width < INLINE_NAV_MIN_WIDTH) {
    // Collapsed: the links live behind the toggle.
    await expect(page.locator(MENU_TOGGLE)).toBeVisible();
    await page.locator(MENU_TOGGLE).click();
  } else {
    // Inline: the toggle should not be rendered at all.
    await expect(page.locator(MENU_TOGGLE)).toBeHidden();
  }

  for (const label of ["Roster", "Meals", "Contributions", "Payment", "Profile"]) {
    await expect(
      page.locator("nav").getByRole("link", { name: label, exact: true }),
      `"${label}" is unreachable at ${testInfo.project.name}`,
    ).toBeVisible();
  }
});

test("the wordmark is never squeezed away", async ({ page }) => {
  // A previous layout let the thirteen-item row crush this to zero width,
  // taking the way back to the dashboard with it.
  await page.goto("/dashboard");
  const wordmark = page.locator("nav a").first();
  await expect(wordmark).toBeVisible();
  const box = await wordmark.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(60);
});

test.describe("collapsed menu", () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) >= INLINE_NAV_MIN_WIDTH,
    "the menu only exists below the inline-nav breakpoint",
  );

  test("names the page you are on", async ({ page }) => {
    await page.goto("/dashboard/meals");
    await expect(page.locator(MENU_TOGGLE)).toContainText("Meals");
  });

  test("closes when you navigate", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator(MENU_TOGGLE).click();
    await expect(page.locator(MENU_TOGGLE)).toHaveAttribute("aria-expanded", "true");

    await page.locator("nav").getByRole("link", { name: "Roster", exact: true }).click();
    await page.waitForURL(/\/dashboard\/roster/);
    await expect(page.locator(MENU_TOGGLE)).toHaveAttribute("aria-expanded", "false");
  });

  test("closes on the back button, not just on link clicks", async ({ page }) => {
    // Regression guard: closing only via an onClick handler leaves the menu
    // open over the previous page when the user goes back.
    await page.goto("/dashboard");
    await page.goto("/dashboard/meals");
    await page.locator(MENU_TOGGLE).click();
    await expect(page.locator(MENU_TOGGLE)).toHaveAttribute("aria-expanded", "true");

    await page.goBack();
    await expect(page.locator(MENU_TOGGLE)).toHaveAttribute("aria-expanded", "false");
  });

  test("closes on Escape", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator(MENU_TOGGLE).click();
    await expect(page.locator(MENU_TOGGLE)).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");
    await expect(page.locator(MENU_TOGGLE)).toHaveAttribute("aria-expanded", "false");
  });

  test("locks the page behind it while open", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");

    await page.locator(MENU_TOGGLE).click();
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  });
});
