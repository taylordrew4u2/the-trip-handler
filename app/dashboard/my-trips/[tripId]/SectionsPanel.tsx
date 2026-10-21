"use client";

import { useState, useTransition } from "react";
import { updateTripSections } from "@/app/actions/trips";
import { NAV_GROUPS, type SectionKey } from "@/lib/nav";

const SECTIONS: { section: SectionKey; label: string }[] = [
  ...NAV_GROUPS.flatMap((g) => g.items).flatMap((i) => (i.section ? [{ section: i.section, label: i.label }] : [])),
  // Not a page: controls the van questions and the transport cost line.
  { section: "transport", label: "Transportation (vans)" },
];

export function SectionsPanel({ tripId, disabled }: { tripId: string; disabled: string[] }) {
  const [off, setOff] = useState<string[]>(disabled);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggle(key: SectionKey) {
    const next = off.includes(key) ? off.filter((k) => k !== key) : [...off, key];
    const previous = off;
    setOff(next);
    setError("");
    startTransition(async () => {
      const result = await updateTripSections(tripId, next);
      if ("error" in result && result.error) {
        setError(result.error);
        setOff(previous);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6 space-y-4">
      <div>
        <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-950">Sections</h2>
        <p className="text-slate-600 text-sm leading-6 mt-2 max-w-2xl">
          Pick what this trip has. Turned-off sections disappear from members&apos; menu, can&apos;t be opened by
          link, and their questions drop out of the guest form and preferences. Turn one back on any time —
          nothing is deleted.
        </p>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {SECTIONS.map((item) => {
          const on = !off.includes(item.section);
          return (
            <li key={item.section}>
              <label className="flex items-center justify-between gap-3 min-h-[44px] rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 cursor-pointer">
                <span className={`text-sm ${on ? "text-slate-900" : "text-slate-500 line-through"}`}>{item.label}</span>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={isPending}
                  onChange={() => toggle(item.section)}
                  aria-label={`Show ${item.label} to members`}
                  className="accent-indigo-600 w-4 h-4"
                />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
