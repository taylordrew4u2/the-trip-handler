import { expect, test } from "@playwright/test";
import { signIn, expectNoHorizontalOverflow, expectTouchTargets, isTouch } from "./helpers";

// Read-only coverage, safe to run at every configured viewport in parallel.
test("guests can find the Board and payment options from their dashboard", async ({ page }) => {
  await signIn(page, "member");
  await page.goto("/dashboard");
  const shortcuts = page.getByRole("region", { name: "Explore the plan" });
  await expect(shortcuts.getByRole("link", { name: /^Board / })).toBeVisible();
  await shortcuts.getByRole("link", { name: /^Payment / }).click();
  await expect(page).toHaveURL(/\/dashboard\/payment$/);
  await expect(page.getByRole("heading", { name: "Ways to pay" })).toBeVisible();
  await expect(page.getByText("Payments open after the organizer finalizes the trip price. Do not send money yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: /by card/ })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  if (await isTouch(page)) await expectTouchTargets(page);
});
