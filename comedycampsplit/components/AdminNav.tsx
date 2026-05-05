"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin/dashboard", label: "📊 Dashboard" },
  { href: "/admin/users", label: "👥 Users" },
  { href: "/admin/trip", label: "🏕️ Trip" },
  { href: "/admin/expenses", label: "💸 Expenses" },
  { href: "/admin/contributions", label: "🎭 Contributions" },
  { href: "/admin/roster", label: "📋 Roster" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="font-bold text-lg text-purple-300">🎪 Admin Panel</h1>
        <p className="text-xs text-gray-400 mt-1">ComedyCampSplit</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-purple-700 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <Link
          href="/admin"
          className="text-xs text-gray-400 hover:text-gray-200"
        >
          ← Back to Login
        </Link>
      </div>
    </aside>
  );
}
