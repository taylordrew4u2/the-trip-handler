"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={
        className ??
        "inline-flex items-center justify-center px-4 min-h-[44px] rounded-lg border border-slate-300 text-sm font-medium text-slate-800 hover:bg-slate-100"
      }
    >
      Sign out
    </button>
  );
}
