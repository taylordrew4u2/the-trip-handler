import { describe, expect, it } from "vitest";
import {
  NAV_GROUPS,
  currentNavItem,
  isActiveNavItem,
  visibleNavGroups,
  visibleNavItems,
} from "@/lib/nav";

describe("nav gating", () => {
  it("hides gated destinations from a pending member", () => {
    const labels = visibleNavItems("PENDING").map((i) => i.label);

    // A pending member can read the plan and finish their guest form…
    expect(labels).toContain("Itinerary");
    expect(labels).toContain("Lodging");
    expect(labels).toContain("Guest form");

    // …but the group tools stay locked until they're approved.
    expect(labels).not.toContain("Roster");
    expect(labels).not.toContain("Sleeping");
    expect(labels).not.toContain("Contributions");
    expect(labels).not.toContain("Payment");
  });

  it("shows every destination once approved", () => {
    const approved = visibleNavItems("APPROVED");
    const all = NAV_GROUPS.flatMap((g) => g.items);
    expect(approved).toHaveLength(all.length);
  });

  it("treats any non-pending status as approved", () => {
    for (const status of ["APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID", null]) {
      expect(visibleNavItems(status).map((i) => i.label)).toContain("Roster");
    }
  });

  it("drops a group heading when every item in it is gated away", () => {
    // "The group" is entirely gated, so a pending member should not be left
    // looking at an empty section.
    const headings = visibleNavGroups("PENDING").map((g) => g.heading);
    expect(headings).not.toContain("The group");
    expect(headings).toContain("Trip");
  });

  it("never lists the same destination twice", () => {
    const hrefs = visibleNavItems("APPROVED").map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("active route matching", () => {
  const home = { href: "/dashboard", label: "Home", exact: true };
  const trips = { href: "/dashboard/my-trips", label: "My trips" };

  it("matches an exact item only on its own path", () => {
    expect(isActiveNavItem(home, "/dashboard")).toBe(true);
    expect(isActiveNavItem(home, "/dashboard/meals")).toBe(false);
  });

  it("matches a prefix item on its nested routes", () => {
    expect(isActiveNavItem(trips, "/dashboard/my-trips")).toBe(true);
    expect(isActiveNavItem(trips, "/dashboard/my-trips/abc123")).toBe(true);
    expect(isActiveNavItem(trips, "/dashboard/roster")).toBe(false);
  });
});

describe("current destination", () => {
  it("names the page the member is on", () => {
    expect(currentNavItem("APPROVED", "/dashboard")?.label).toBe("Home");
    expect(currentNavItem("APPROVED", "/dashboard/meals")?.label).toBe("Meals");
  });

  it("resolves a nested route to its most specific destination", () => {
    // Not "Home" — the compact header would otherwise lie about where you are.
    expect(currentNavItem("APPROVED", "/dashboard/my-trips/abc123")?.label).toBe("My trips");
  });

  it("returns nothing for a page outside the nav", () => {
    expect(currentNavItem("APPROVED", "/dashboard/walkthrough")).toBeUndefined();
  });

  it("never names a destination a pending member cannot open", () => {
    expect(currentNavItem("PENDING", "/dashboard/roster")).toBeUndefined();
  });
});
