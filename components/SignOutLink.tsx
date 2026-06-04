"use client";

import { signOut } from "next-auth/react";

export function SignOutLink() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-xs text-stone-500 hover:text-stone-900"
      type="button"
    >
      Sign out
    </button>
  );
}
