import { expect, type Page } from "@playwright/test";

/** Accounts created by `prisma/seed.ts`. */
export const SEEDED = {
  organizer: { email: "demo@thetriphandler.app", password: "demo1234" },
  member: { email: "alex@example.com", password: "demo1234" },
};

/**
 * The 44px minimum from Apple's Human Interface Guidelines and WCAG 2.5.5.
 * Checked at 40px to leave room for sub-pixel layout rounding while still
 * catching the 22–32px controls this suite exists to prevent.
 */
const MIN_TOUCH_TARGET_PX = 40;

export async function signIn(page: Page, who: keyof typeof SEEDED) {
  const { email, password } = SEEDED[who];
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);
}

/**
 * Nothing may extend past the right edge of the viewport, and the document
 * itself must not scroll sideways.
 *
 * Elements that opt into their own horizontal scrolling are exempt — a wide
 * table inside its own scroller is a deliberate choice, not a broken layout.
 */
export async function expectNoHorizontalOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const viewportWidth = doc.clientWidth;
    const offenders: string[] = [];

    for (const el of document.querySelectorAll("body *")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (getComputedStyle(el).overflowX === "auto") continue;
      if (rect.right > viewportWidth + 1) {
        offenders.push(
          `<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 80)}"> ` +
            `extends to ${Math.round(rect.right)}px`,
        );
      }
    }

    return {
      documentOverflow: doc.scrollWidth - viewportWidth,
      offenders: [...new Set(offenders)].slice(0, 5),
      viewportWidth,
    };
  });

  expect(
    result.offenders,
    `elements overflow the ${result.viewportWidth}px viewport`,
  ).toEqual([]);
  expect(result.documentOverflow, "the page scrolls sideways").toBeLessThanOrEqual(0);
}

/**
 * Every control a thumb has to hit must clear the touch-target floor.
 *
 * Links rendered inline within a run of prose are exempt: they are part of a
 * sentence, not a control, and padding them to 44px would wreck the paragraph.
 */
export async function expectTouchTargets(page: Page) {
  const tooSmall = await page.evaluate((min) => {
    const selector = [
      "button",
      "a[href]",
      "select",
      "textarea",
      "input:not([type=checkbox]):not([type=radio]):not([type=hidden])",
    ].join(", ");
    const offenders: string[] = [];

    for (const el of document.querySelectorAll(selector)) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (getComputedStyle(el).display === "inline") continue;
      if (rect.height < min) {
        const label = (el.textContent ?? "").trim().slice(0, 30) || el.getAttribute("aria-label") || "";
        offenders.push(`<${el.tagName.toLowerCase()}> "${label}" is ${Math.round(rect.height)}px tall`);
      }
    }

    return [...new Set(offenders)].slice(0, 5);
  }, MIN_TOUCH_TARGET_PX);

  expect(tooSmall, `controls below the ${MIN_TOUCH_TARGET_PX}px touch minimum`).toEqual([]);
}

/** True when the browser reports a touch pointer, which is what the app's sizing keys off. */
export function isTouch(page: Page) {
  return page.evaluate(() => matchMedia("(pointer: coarse)").matches);
}
