"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/trip", label: "Trip" },
  { href: "/admin/expenses", label: "Expenses" },
  { href: "/admin/contributions", label: "Contributions" },
  { href: "/admin/roster", label: "Roster" },
  { href: "/admin/diagnostics", label: "Diagnostics" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <div className="p-5 border-b border-stone-800">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Admin</p>
        <h1 className="font-serif text-lg font-medium text-stone-100 mt-1 leading-tight">
          Comedy Summer Camp
        </h1>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-stone-100 text-stone-900"
                  : "text-stone-400 hover:bg-stone-900 hover:text-stone-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-stone-800">
        <Link
          href="/admin"
          className="text-xs text-stone-500 hover:text-stone-300"
        >
          ← Admin login
        </Link>
      </div>
    </aside>
  );
}
