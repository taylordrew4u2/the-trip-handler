/**
 * Capture the README's screenshots from the real, running app.
 *
 * These used to be hand-drawn SVG mockups. A mockup is a claim about what the
 * app looks like; a capture is evidence. It also can't quietly go stale — run
 * this after a UI change and the diff shows up in review.
 *
 * Usage:
 *   npm run build && npx next start -p 3222 &
 *   npm run screenshots
 *
 * Requires a seeded database and the same NEXTAUTH_URL/NEXT_PUBLIC_APP_URL the
 * server is running with. Re-seed first (`npm run db:seed`) if the e2e suite has
 * run against this database — its functional tests post to the board, and those
 * posts would end up in the screenshots.
 */
import { chromium, devices, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3222";
const OUT = path.join(process.cwd(), "docs", "screenshots");

const ACCOUNTS = {
  organizer: { email: "demo@thetriphandler.app", password: "demo1234" },
  member: { email: "alex@example.com", password: "demo1234" },
};

/**
 * 1536px is where the nav switches from the grouped sheet to the inline bar,
 * so it is the width that shows the desktop layout as designed.
 */
const DESKTOP = { width: 1536, height: 960 };
/**
 * The phone shots exist to show the app is not a shrunken desktop layout.
 * `defaultBrowserType` is dropped: the descriptor names WebKit, which isn't
 * installed here, and it isn't a valid browser-context option anyway.
 */
const PHONE = (() => {
  const { defaultBrowserType, ...rest } = devices["iPhone 13"];
  void defaultBrowserType;
  return rest;
})();

type Shot = {
  name: string;
  as: keyof typeof ACCOUNTS;
  path: string;
  /** Run before capturing — open a panel, scroll to a section. */
  prepare?: (page: Page) => Promise<void>;
  phone?: boolean;
};

const SHOTS: Shot[] = [
  { name: "dashboard", as: "member", path: "/dashboard" },
  { name: "itinerary", as: "member", path: "/dashboard/itinerary" },
  { name: "sleeping", as: "member", path: "/dashboard/sleeping" },
  { name: "meals", as: "member", path: "/dashboard/meals" },
  { name: "roster", as: "member", path: "/dashboard/roster" },
  { name: "board", as: "member", path: "/dashboard/board" },
  { name: "my-trips", as: "organizer", path: "/dashboard/my-trips" },
  { name: "dashboard-mobile", as: "member", path: "/dashboard", phone: true },
  { name: "sleeping-mobile", as: "member", path: "/dashboard/sleeping", phone: true },
  {
    name: "nav-mobile",
    as: "member",
    path: "/dashboard",
    phone: true,
    prepare: async (page) => {
      await page.getByRole("button", { name: /menu/i }).click();
      await page.waitForTimeout(400);
    },
  },
];

async function signIn(page: Page, as: keyof typeof ACCOUNTS) {
  const { email, password } = ACCOUNTS[as];
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const shot of SHOTS) {
    const context = await browser.newContext(
      shot.phone
        ? { ...PHONE, deviceScaleFactor: 2 }
        : { viewport: DESKTOP, deviceScaleFactor: 2 },
    );
    const page = await context.newPage();

    await signIn(page, shot.as);
    await page.goto(`${BASE}${shot.path}`);
    // Let fonts settle before capturing, or the first shot renders in a fallback face.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await shot.prepare?.(page);

    const file = path.join(OUT, `${shot.name}.png`);
    await page.screenshot({ path: file });
    console.log(`✓ ${shot.name}.png`);

    await context.close();
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
