import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/actions/payments", () => ({
  createCheckoutSession: vi.fn(),
  submitManualPayment: vi.fn(),
}));
vi.mock("@/components/compressImage", () => ({ compressImage: vi.fn() }));

import { PaymentClient, type PaymentView } from "@/app/dashboard/(member)/payment/PaymentClient";
import { visibleNavItems } from "@/lib/nav";

const view: PaymentView = {
  tripName: "Test trip", costShareDivisor: 2, isLocked: false, isPaid: false,
  lineItems: null, share: 100, bed: null, personalAdjustment: null,
  deposit: 20, total: 120, paid: 0, remaining: 120,
  venmoHandle: "organizer-test", cashAppHandle: "organizer-test",
  cardEnabled: true, payments: [],
};
const render = (overrides: Partial<PaymentView> = {}) =>
  renderToStaticMarkup(createElement(PaymentClient, { view: { ...view, ...overrides } }));

describe("payment visibility", () => {
  it("shows configured methods before prices are locked, but no payment controls or transfer links", () => {
    const html = render();
    expect(html).toContain("Ways to pay");
    expect(html).toContain("Card");
    expect(html).toContain("Venmo");
    expect(html).toContain("Cash App");
    expect(html).toContain("Do not send money yet.");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("organizer-test");
    expect(html).not.toContain("https://venmo.com");
    expect(html).not.toContain("https://cash.app");
  });

  it("does not advertise unconfigured methods", () => {
    const html = render({ cardEnabled: false, cashAppHandle: null });
    expect(html).toContain("Venmo");
    expect(html).not.toContain(">Card<");
    expect(html).not.toContain("Cash App");
  });

  it("explains missing payment setup instead of leaving a blank area", () => {
    const html = render({ cardEnabled: false, venmoHandle: null, cashAppHandle: null });
    expect(html).toContain("added online payment methods yet.");
    expect(html).toContain("Payments open after the organizer finalizes the trip price.");
    expect(html).not.toContain("<button");
  });

  it("preserves card and manual-payment controls once prices are locked", () => {
    const html = render({ isLocked: true });
    expect(html).toContain("Ways to pay");
    expect(html).toContain("Pay $120.00 by card");
    expect(html).toContain(">Venmo</button>");
    expect(html).toContain(">Cash App</button>");
    expect(html).not.toContain("Do not send money yet.");
  });

  it("keeps the agreed offline-payment flow when no online method is configured", () => {
    const html = render({ isLocked: true, cardEnabled: false, venmoHandle: null, cashAppHandle: null });
    expect(html).toContain("Arrange payment directly with the organizer");
    expect(html).toContain(">I paid the organizer</button>");
    expect(html).not.toContain("by card");
  });

  it("does not ask a confirmed-paid member to pay again", () => {
    const html = render({ isLocked: true, isPaid: true, remaining: 0, paid: 120 });
    expect(html).toContain("Your payment was received.");
    expect(html).not.toContain("Ways to pay");
    expect(html).not.toContain("<button");
  });

  it("keeps payment and Board gated for pending users and disabled sections", () => {
    for (const href of ["/dashboard/payment", "/dashboard/board"]) {
      expect(visibleNavItems("PENDING").some((item) => item.href === href)).toBe(false);
      expect(visibleNavItems("APPROVED").some((item) => item.href === href)).toBe(true);
      expect(visibleNavItems("APPROVED", ["payment", "board"]).some((item) => item.href === href)).toBe(false);
    }
  });
});
