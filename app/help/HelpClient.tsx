"use client";

import { useState } from "react";
import { HELP_SECTIONS } from "@/lib/help";

export function HelpClient() {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const sections = HELP_SECTIONS.map(section => ({ ...section, faqs: section.faqs.filter(faq => !query || `${section.title} ${faq.question} ${faq.answer}`.toLowerCase().includes(query)) })).filter(section => !query || section.faqs.length);
  return <div className="mt-7 space-y-7">
    <label className="block text-sm font-semibold text-slate-800">Search help
      <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Try approval, questions, roster, or payment" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-normal text-slate-900" />
    </label>
    <nav aria-label="Help topics" className="flex flex-wrap gap-2">{HELP_SECTIONS.map(s => <a key={s.id} href={`#${s.id}`} onClick={() => setSearch("")} className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm text-indigo-700">{s.title}</a>)}</nav>
    {query && <p role="status" className="text-sm text-slate-600">{sections.reduce((count, s) => count + s.faqs.length, 0)} answers found.{!sections.length && " Try a different word or choose a topic above."}</p>}
    {sections.map(section => <section key={section.id} id={section.id} className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="font-serif text-2xl font-medium text-slate-950">{section.title}</h2>
      {!query && <><p className="mt-2 text-sm leading-6 text-slate-600">{section.intro}</p><ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-800">{section.steps.map(step => <li key={step}>{step}</li>)}</ol></>}
      <div className="mt-5 divide-y divide-slate-200">{section.faqs.map(faq => <details key={faq.question} className="py-2" open={query ? true : undefined}>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold leading-6 text-slate-950">{faq.question}</summary>
        <p className="pb-3 pt-1 text-sm leading-7 text-slate-600">{faq.answer}</p>
      </details>)}</div>
    </section>)}
  </div>;
}
