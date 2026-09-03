"use client";

import { signOut } from "next-auth/react";

export function SignOutLink() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex items-center min-h-[44px] px-1 text-sm text-stone-500 hover:text-stone-900 whitespace-nowrap"
      type="button"
    >
      Sign out
    </button>
  );
}
