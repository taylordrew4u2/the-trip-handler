"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useId, useState } from "react";

type NavItem = { href: string; label: string; exact?: boolean; gated?: boolean };
type NavGroup = { heading: string; items: NavItem[] };

// Grouped so the mobile sheet reads as a map of the trip rather than a wall of
// thirteen links. The desktop bar flattens these back into one row.
const navGroups: NavGroup[] = [
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

function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function DashboardNav({ status }: { status: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  const isPending = status === "PENDING";
  const groups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((i) => !i.gated || !isPending) }))
    .filter((group) => group.items.length > 0);
  const flatItems = groups.flatMap((group) => group.items);

  const current = flatItems.find((item) => isActive(item, pathname));

  // Navigating away closes the sheet — including via the back button, which no
  // link handler would catch. Adjusting during render (rather than in an effect)
  // keeps the new page from painting with the menu still over it.
  const [pathnameWhenOpened, setPathnameWhenOpened] = useState(pathname);
  if (pathnameWhenOpened !== pathname) {
    setPathnameWhenOpened(pathname);
    setOpen(false);
  }

  // While the sheet covers the screen, the page behind it shouldn't scroll,
  // and Escape should get you out.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50 pt-safe">
      <div className="max-w-6xl mx-auto gutter">
        {/* Sits above the dimming overlay so the toggle stays tappable. */}
        <div className="relative z-50 flex items-center justify-between gap-4 h-14 2xl:h-16">
          <Link
            href="/dashboard"
            className="inline-flex items-center shrink-0 min-h-[44px] font-serif text-base 2xl:text-lg font-medium text-stone-900"
          >
            The Trip Handler
          </Link>

          {/* Desktop: every destination inline. */}
          <div className="hidden 2xl:flex items-center gap-1">
            {flatItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item, pathname) ? "page" : undefined}
                className={`px-2.5 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive(item, pathname)
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-2.5 py-1.5 rounded-md text-sm font-medium text-stone-500 hover:text-stone-900 ml-1 whitespace-nowrap"
            >
              Sign out
            </button>
          </div>

          {/* Mobile: where you are, plus one button to everything else. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={menuId}
            className="2xl:hidden flex items-center gap-2 -mr-2 pl-3 pr-2 min-h-[44px] rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100 active:bg-stone-200"
          >
            <span className="max-w-[8rem] truncate">{current?.label ?? "Menu"}</span>
            <svg
              viewBox="0 0 20 20"
              className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 7.5 10 12.5 15 7.5" />
            </svg>
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      {/* Mobile sheet. Tall enough to need scrolling on small phones, capped so
          the header stays visible and tappable to dismiss. */}
      {open && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="2xl:hidden fixed inset-0 bg-stone-900/20 z-40"
          />
          <div
            id={menuId}
            className="2xl:hidden absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain bg-white border-b border-stone-200 shadow-lg pb-safe"
          >
            <div className="px-4 py-3 space-y-5">
              {groups.map((group) => (
                <div key={group.heading}>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400 px-1 mb-1">
                    {group.heading}
                  </p>
                  <ul>
                    {group.items.map((item) => {
                      const active = isActive(item, pathname);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={`flex items-center min-h-[44px] px-3 rounded-lg text-[15px] font-medium transition-colors ${
                              active
                                ? "bg-stone-900 text-white"
                                : "text-stone-700 active:bg-stone-100"
                            }`}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className="border-t border-stone-200 pt-3">
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center w-full min-h-[44px] px-3 rounded-lg text-[15px] font-medium text-stone-500 active:bg-stone-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
