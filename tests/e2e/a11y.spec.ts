import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * Automated accessibility checks.
 *
 * The responsive suite proves the layout holds and the touch targets are big
 * enough; neither of those says anything about whether the page is usable with
 * a screen reader or a keyboard. This suite runs axe-core against every page a
 * member or an organizer actually visits, and fails on any violation at the
 * WCAG 2.1 A/AA level.
 *
 * A note on scope. axe catches the mechanical half of accessibility — contrast,
 * names, roles, landmarks, heading order — which is roughly a third of WCAG in
 * practice. It cannot tell you whether a flow makes sense to someone who can't
 * see it. That half stays a manual review, and this suite is not a claim to
 * have done it.
 *
 * Layout-independent, so these run on a single project rather than five.
 */

const ONLY_PROJECT = "phone-390";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();

  // Report the rule, the impact and one offending selector per violation:
  // "serious color-contrast" alone doesn't tell you where to look.
  return violations.map(
    (v) =>
      `${v.impact ?? "unknown"} · ${v.id} · ${v.nodes.length} node(s) · ` +
      `first: ${v.nodes[0]?.target.join(" ")}`,
  );
}

const PUBLIC_PAGES = ["/", "/login", "/signup", "/join/demo-invite-token"];

for (const path of PUBLIC_PAGES) {
  test(`public page ${path} has no accessibility violations`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== ONLY_PROJECT, `a11y is layout-independent`);
    await page.goto(path);
    expect(await scan(page), `axe violations on ${path}`).toEqual([]);
  });
}

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
  "/dashboard/payment",
  "/dashboard/preferences",
  "/dashboard/profile",
  "/dashboard/intake",
];

test.describe("member pages", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== ONLY_PROJECT, `a11y is layout-independent`);
    await signIn(page, "member");
  });

  for (const path of MEMBER_PAGES) {
    test(`${path} has no accessibility violations`, async ({ page }) => {
      await page.goto(path);
      expect(await scan(page), `axe violations on ${path}`).toEqual([]);
    });
  }

  test("the navigation sheet is accessible when open", async ({ page }) => {
    // The sheet is the one piece of UI that exists only after an interaction,
    // so a page-load scan would never see it.
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /menu/i }).click();
    expect(await scan(page), "axe violations in the open nav sheet").toEqual([]);
  });
});

test.describe("organizer pages", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== ONLY_PROJECT, `a11y is layout-independent`);
    await signIn(page, "organizer");
  });

  for (const path of ["/dashboard/my-trips", "/dashboard/start", "/dashboard/walkthrough"]) {
    test(`${path} has no accessibility violations`, async ({ page }) => {
      await page.goto(path);
      expect(await scan(page), `axe violations on ${path}`).toEqual([]);
    });
  }

  test("a trip's management page has no accessibility violations", async ({ page }) => {
    await page.goto("/dashboard/my-trips");
    await page.getByRole("link", { name: /edit details/i }).first().click();
    await page.waitForURL(/\/dashboard\/my-trips\/.+/);
    expect(await scan(page), "axe violations on the trip management page").toEqual([]);
  });
});
