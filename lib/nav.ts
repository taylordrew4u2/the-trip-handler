/**
 * The member dashboard's navigation map.
 *
 * This lives outside the component so the routing rules — which destinations
 * exist, which are gated behind approval, and which one counts as "current" for
 * a given URL — can be tested directly, without rendering or a browser.
 */

export type NavItem = {
  href: string;
  label: string;
  /** Match the path exactly rather than by prefix. */
  exact?: boolean;
  /** Hidden until the member is approved. */
  gated?: boolean;
};

export type NavGroup = {
  heading: string;
  items: NavItem[];
};

/**
 * Grouped so the mobile sheet reads as a map of the trip rather than a wall of
 * thirteen links. The wide-screen bar flattens these back into a single row.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    heading: "Trip",
    items: [
      { href: "/dashboard", label: "Home", exact: true },
      { href: "/dashboard/my-trips", label: "My trips" },
      { href: "/dashboard/itinerary", label: "Itinerary" },
      { href: "/dashboard/lodging", label: "Lodging" },
    ],
  },
  {
    heading: "The group",
    items: [
      { href: "/dashboard/roster", label: "Roster", gated: true },
      { href: "/dashboard/sleeping", label: "Sleeping", gated: true },
      { href: "/dashboard/meals", label: "Meals", gated: true },
      { href: "/dashboard/board", label: "Board", gated: true },
      { href: "/dashboard/contributions", label: "Contributions", gated: true },
    ],
  },
  {
    heading: "You",
    items: [
      { href: "/dashboard/intake", label: "Guest form" },
      { href: "/dashboard/preferences", label: "Preferences", gated: true },
      { href: "/dashboard/payment", label: "Payment", gated: true },
      { href: "/dashboard/profile", label: "Profile" },
    ],
  },
];

/**
 * The groups a member of this status may see. Gated destinations disappear for
 * PENDING users; empty groups drop out entirely rather than leaving a stray
 * heading behind.
 *
 * This mirrors, and never replaces, the server-side checks in `lib/approval.ts`
 * — hiding a link is a UI affordance, not the security boundary.
 */
export function visibleNavGroups(status: string | null): NavGroup[] {
  const isPending = status === "PENDING";
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.gated || !isPending),
  })).filter((group) => group.items.length > 0);
}

/** Every visible destination in one list, in group order. */
export function visibleNavItems(status: string | null): NavItem[] {
  return visibleNavGroups(status).flatMap((group) => group.items);
}

/**
 * Whether `item` is the destination the given path is on.
 *
 * "/dashboard" is exact — without that it would prefix-match every page in the
 * dashboard and light up alongside the real current item.
 */
export function isActiveNavItem(item: NavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/**
 * The destination to name in the compact header.
 *
 * The longest matching href wins, so a nested route resolves to the most
 * specific destination rather than whichever ancestor happens to come first in
 * the nav order.
 */
export function currentNavItem(status: string | null, pathname: string): NavItem | undefined {
  return visibleNavItems(status)
    .filter((item) => isActiveNavItem(item, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
