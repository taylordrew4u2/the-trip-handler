"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type NavItem = { href: string; label: string; exact?: boolean; gated?: boolean };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Home", exact: true },
  { href: "/dashboard/roster", label: "Roster", gated: true },
  { href: "/dashboard/itinerary", label: "Itinerary", gated: true },
  { href: "/dashboard/sleeping", label: "Sleeping", gated: true },
  { href: "/dashboard/expenses", label: "Expenses", gated: true },
  { href: "/dashboard/contributions", label: "Contributions", gated: true },
  { href: "/dashboard/board", label: "Board", gated: true },
  { href: "/dashboard/intake", label: "Guest form" },
  { href: "/dashboard/preferences", label: "Preferences", gated: true },
  { href: "/dashboard/payment", label: "Payment", gated: true },
  { href: "/dashboard/profile", label: "Profile" },
];

export function DashboardNav({ status }: { status: string | null }) {
  const pathname = usePathname();
  const isPending = status === "PENDING";
  const visible = navItems.filter((item) => !item.gated || !isPending);

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/dashboard" className="font-serif text-lg font-medium text-stone-900 whitespace-nowrap">
            Comedy Summer Camp
          </Link>
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
            {visible.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "bg-stone-900 text-white"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-stone-500 hover:text-stone-900 ml-1 whitespace-nowrap"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
