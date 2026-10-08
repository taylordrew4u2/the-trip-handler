"use client";

import Link from "next/link";
import { Brand } from "@/components/Brand";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useId, useState } from "react";
import {
  currentNavItem,
  isActiveNavItem,
  visibleNavGroups,
} from "@/lib/nav";

export function DashboardNav({ status }: { status: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  const groups = visibleNavGroups(status);
  const current = currentNavItem(status, pathname);

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
    <nav aria-label="Trip navigation" className="sticky top-0 z-50 border-b border-slate-200 bg-white pt-safe">
      <div className="relative z-50 mx-auto flex h-16 max-w-[96rem] items-center justify-between gap-3 gutter">
        <Link href="/dashboard" className="flex min-h-11 min-w-0 items-center" aria-label="The Trip Handler dashboard">
          <Brand compact />
        </Link>
        <div className="hidden items-center gap-6 2xl:flex">
          <span className="text-sm text-slate-600">Your trip workspace</span>
          <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
            Sign out
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={menuId}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 2xl:hidden"
        >
          <span className="max-w-[6rem] truncate sm:max-w-[8rem]">{current?.label ?? "Menu"}</span>
          <svg viewBox="0 0 20 20" className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 7.5 10 12.5 15 7.5" />
          </svg>
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      <div className="fixed bottom-0 left-0 top-16 hidden w-60 overflow-y-auto border-r border-slate-200 bg-white px-4 py-6 pb-safe 2xl:block">
        <p className="mb-6 px-3 text-xs leading-5 text-slate-600">One shared plan.<br />Everyone in the loop.</p>
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.heading}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{group.heading}</p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = isActiveNavItem(item, pathname);
                  return (
                    <li key={item.href}>
                      <Link href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"}`}>
                        <span aria-hidden="true" className={`h-5 w-1 rounded-full ${active ? "bg-indigo-600" : "bg-slate-200"}`} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <>
          <button type="button" tabIndex={-1} aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-950/30 2xl:hidden" />
          <div id={menuId} className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b border-slate-200 bg-white shadow-xl pb-safe 2xl:hidden">
            <div className="mx-auto grid max-w-3xl gap-6 px-4 py-5 sm:grid-cols-3">
              {groups.map((group) => (
                <div key={group.heading}>
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{group.heading}</p>
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const active = isActiveNavItem(item, pathname);
                      return (
                        <li key={item.href}>
                          <Link href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition-colors ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50 active:bg-slate-100"}`}>
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-3 sm:col-span-3">
                <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="flex min-h-11 w-full items-center rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
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
