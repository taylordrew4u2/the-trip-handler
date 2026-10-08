import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/Brand";

export function AuthShell({ eyebrow, title, description, children }: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#f6f7fb] text-slate-900 pb-safe">
      <header className="border-b border-slate-200/80 bg-white pt-safe">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 gutter">
          <Link href="/" className="flex min-h-11 min-w-0 items-center" aria-label="The Trip Handler home">
            <Brand />
          </Link>
          <Link href="/" className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950">
            <span aria-hidden="true" className="mr-2">←</span> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-8 gutter py-10 sm:py-14 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-20 lg:py-20">
        <div className="min-w-0">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">{eyebrow}</p>
          <h1 className="max-w-xl break-words font-serif text-4xl font-medium leading-[1.1] tracking-tight text-slate-950 text-balance sm:text-5xl">{title}</h1>
          <div className="mt-5 max-w-lg text-sm leading-7 text-slate-600 sm:text-base">{description}</div>

          <div className="mt-10 hidden max-w-lg space-y-3 lg:block">
            {[
              ["01", "Your people", "Private invites and a roster you approve."],
              ["02", "One shared plan", "Lodging, meals, and logistics in one place."],
              ["03", "Clear costs", "A simple view of everyone's trip share."],
            ].map(([number, label, detail]) => (
              <div key={number} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-xs font-semibold text-indigo-700">{number}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full min-w-0 max-w-lg lg:mx-0">{children}</div>
      </main>
    </div>
  );
}
