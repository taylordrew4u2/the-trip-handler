import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * Functional coverage for the board, which is the one place a member both
 * writes and reads back in the same view.
 *
 * The responsive suite next door only asserts layout, and that turned out to be
 * a real blind spot: a `"use server"` module that exports anything other than an
 * async function is rejected by Next at *call* time, not at build or render
 * time. The page kept returning 200 and every layout assertion kept passing
 * while posting and reacting were broken with a 500. Only invoking an action
 * catches that class of bug.
 *
 * These tests mutate data, so they run on a single project rather than once per
 * viewport, and each one undoes what it does.
 */

const ONLY_PROJECT = "phone-390";

test.describe("board", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== ONLY_PROJECT,
      `mutating flows run once, on ${ONLY_PROJECT}`,
    );
    await signIn(page, "member");
    await page.goto("/dashboard/board");
  });

  test("a member can post, and sees it appear", async ({ page }) => {
    const message = `e2e post ${Date.now()}`;

    const composer = page.locator("textarea").first();
    await composer.fill(message);
    await page.locator("form button[type=submit]").first().click();

    await expect(page.getByText(message)).toBeVisible();
    // The composer is only cleared on success, so this fails if the action
    // errored — without it the assertion above can pass on a broken post.
    await expect(composer).toHaveValue("");
  });

  test("a member can add and remove a reaction", async ({ page }) => {
    // Needs a post to react to; the composer is the cheapest way to guarantee one.
    const message = `e2e reaction target ${Date.now()}`;
    await page.locator("textarea").first().fill(message);
    await page.locator("form button[type=submit]").first().click();
    await expect(page.getByText(message)).toBeVisible();

    const add = page.getByRole("button", { name: /Add 👍 reaction/ }).first();
    await expect(add).toBeVisible();
    await add.click();

    // Reacting flips the button into its pressed state and shows the count.
    const remove = page.getByRole("button", { name: /Remove 👍 reaction/ }).first();
    await expect(remove).toBeVisible();
    await expect(remove).toHaveAttribute("aria-pressed", "true");

    // Toggling off leaves no trace, so the test is repeatable.
    await remove.click();
    await expect(page.getByRole("button", { name: /Add 👍 reaction/ }).first()).toBeVisible();
  });

  test("server actions on this page do not error", async ({ page }) => {
    // A "use server" module with an illegal export fails only when an action is
    // invoked, surfacing as a 500 on the action request rather than the page.
    const failures: string[] = [];
    page.on("response", (r) => {
      if (r.status() >= 500) failures.push(`${r.status()} ${new URL(r.url()).pathname}`);
    });
    page.on("pageerror", (e) => failures.push(`pageerror: ${e.message}`));

    await page.locator("textarea").first().fill(`e2e action check ${Date.now()}`);
    await page.locator("form button[type=submit]").first().click();
    await page.waitForTimeout(1500);

    expect(failures, "server action or client error while posting").toEqual([]);
  });
});

test.describe("sleeping", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== ONLY_PROJECT, `mutating flows run once, on ${ONLY_PROJECT}`);
    await signIn(page, "member");
    await page.goto("/dashboard/sleeping");
  });

  test("a member can claim a bed and leave it again", async ({ page }) => {
    // Claiming runs inside a serializable transaction that re-counts the
    // occupants; the mocked unit tests cover the branches, this covers the
    // fact that the transaction actually commits against real Postgres.
    const failures: string[] = [];
    page.on("response", (r) => {
      if (r.status() >= 500) failures.push(`${r.status()} ${new URL(r.url()).pathname}`);
    });

    const claim = page.getByRole("button", { name: /claim/i }).first();
    await expect(claim).toBeVisible();
    await claim.click();

    const leave = page.getByRole("button", { name: /leave|give up/i }).first();
    await expect(leave).toBeVisible();

    // Put the seed data back the way it was so the test is repeatable.
    await leave.click();
    await expect(page.getByRole("button", { name: /claim/i }).first()).toBeVisible();

    expect(failures, "server action errored while claiming a bed").toEqual([]);
  });
});
