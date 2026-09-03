import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end responsive tests.
 *
 * These run against a production build with a seeded database, because the
 * things they assert — layout at a given width, computed control sizes — only
 * exist once the real CSS is compiled and the real data is on the page.
 *
 * Viewports are declared as projects so a failure names the device it broke on.
 * The phone and tablet projects use Playwright's device descriptors rather than
 * a bare viewport size: those set `hasTouch`/`isMobile`, which is what makes
 * `@media (pointer: coarse)` match. The app sizes its touch targets off that
 * media query, so a plain viewport override would silently test the desktop
 * styles at a phone width and pass while the real thing was broken.
 *
 * Every project runs on Chromium, overriding the WebKit default that Apple
 * device descriptors carry. What is under test here is this app's layout and
 * media queries, not rendering-engine differences, so one engine keeps CI to a
 * single browser download. The trade-off is real and worth naming: this suite
 * cannot catch a Safari-specific bug, so Safari stays a manual check.
 */

const PORT = Number(process.env.PORT ?? 3222);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Layout assertions are deterministic; a retry would only mask a real break.
  retries: 0,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },

  projects: [
    // 320px — the narrowest screen still in real use, and the one that breaks
    // layouts first.
    {
      name: "phone-320",
      use: { ...devices["Galaxy S5"], browserName: "chromium", viewport: { width: 320, height: 568 } },
    },
    { name: "phone-390", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    // A tablet is ~768px AND a touch device — the case a width-only breakpoint
    // gets wrong.
    { name: "tablet-768", use: { ...devices["iPad Mini"], browserName: "chromium" } },
    { name: "laptop-1280", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "desktop-1536", use: { ...devices["Desktop Chrome"], viewport: { width: 1536, height: 960 } } },
  ],

  webServer: {
    command: `npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
