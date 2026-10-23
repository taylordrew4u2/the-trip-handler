"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveIntakeQuestions } from "@/app/actions/intakeQuestions";
import { ESSENTIAL_QUESTIONS, fillIntakeAmounts, visibleQuestions, validateIntakeQuestions, type IntakeQuestion } from "@/lib/intakeQuestions";
import { IntakeQuestions } from "@/components/IntakeQuestions";

const input = "mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
const button = "min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-40";
const types = { text: "Short answer", textarea: "Long answer", radio: "Choose one", checkbox: "Agreement checkbox", checks: "Choose several" } as const;

export function IntakeEditor({ tripId, initial, defaults, off, deposit }: { tripId: string; initial: IntakeQuestion[]; defaults: IntakeQuestion[]; off: string[]; deposit: number }) {
  const [questions, setQuestions] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [search, setSearch] = useState("");
  function change(next: IntakeQuestion[]) { setQuestions(next); setSaved(false); setDirty(true); }
  function edit(index: number, patch: Partial<IntakeQuestion>) { change(questions.map((q, i) => i === index ? { ...q, ...patch } : q)); }
  function move(index: number, offset: number) {
    const next = [...questions];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    change(next);
  }

  return <div className="space-y-5">
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-6 text-indigo-950">
      <p><strong>How to edit:</strong> open a question below, change its wording, and choose whether it is required or hidden. Use Add question for anything else you need to ask.</p>
      <p className="mt-2">Name and phone number stay required so applications can be identified. Use {"{deposit}"} in text to show the trip’s current deposit amount. Questions for a section you turned off will stay hidden. <Link href="/help#organizers" className="inline-flex min-h-11 items-center font-semibold underline">Organizer help</Link></p>
    </div>
    <div className="sticky top-32 md:top-16 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <button type="button" disabled={pending || !dirty} onClick={() => {
        const validated = validateIntakeQuestions(questions);
        if (validated.error) { setError(validated.error); return; }
        setError(""); setSaved(false);
        startTransition(async () => {
          try {
            const result = await saveIntakeQuestions(tripId, questions);
            if (result.error) setError(result.error);
            else { setSaved(true); setDirty(false); }
          } catch { setError("Your questions were not saved. Please try again."); }
        });
      }} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save questions"}</button>
      <button type="button" onClick={() => setPreview(!preview)} className={button}>{preview ? "Back to editing" : "Preview guest form"}</button>
      <span className="text-sm text-slate-600">{visibleQuestions(questions, off).length} visible questions · {dirty ? "Unsaved changes" : "No unsaved changes"}</span>
      {saved && <p role="status" className="w-full text-sm text-green-800">Questions saved. New submissions will use these questions.</p>}
      {error && <p role="alert" className="w-full text-sm text-red-800">{error}</p>}
    </div>
    {preview ? <div>
      <p className="mb-4 text-sm text-slate-600">This preview includes your unsaved changes. Controls are disabled so no application is submitted.</p>
      <fieldset disabled><legend className="sr-only">Guest form preview</legend><IntakeQuestions questions={visibleQuestions(fillIntakeAmounts(questions, deposit), off)} /></fieldset>
    </div> : <>
      <label className="block text-sm font-medium text-slate-800">Find a question<input type="search" value={search} onChange={e => setSearch(e.target.value)} className={input} placeholder="Search question text or section" /></label>
      <fieldset disabled={pending} className="min-w-0 space-y-3">
        <legend className="sr-only">Question editor</legend>
        {questions.map((q, index) => {
          if (search && !`${q.label} ${q.section}`.toLowerCase().includes(search.toLowerCase())) return null;
          const essential = ESSENTIAL_QUESTIONS.includes(q.id);
          const custom = q.id.startsWith("custom_");
          const inactive = q.when && off.includes(q.when);
          return <details key={q.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <summary className="min-h-11 cursor-pointer break-words text-sm font-semibold leading-6 text-slate-950">{index + 1}. {q.label} <span className="font-normal text-slate-600">· {inactive ? "Section is off" : q.hidden ? "Hidden" : q.required ? "Required" : "Optional"}</span></summary>
            <div className="mt-4 grid min-w-0 gap-4">
              <label className="text-sm text-slate-700">Question text<input value={q.label} maxLength={500} onChange={e => edit(index, { label: e.target.value })} className={input} /></label>
              <label className="text-sm text-slate-700">Help text (optional)<textarea value={q.help} maxLength={2000} onChange={e => edit(index, { help: e.target.value })} rows={2} className={input} /></label>
              <label className="text-sm text-slate-700">Section heading<input value={q.section} maxLength={100} onChange={e => edit(index, { section: e.target.value })} className={input} /></label>
              <p className="text-sm text-slate-600">Answer type: {types[q.type]}</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={q.required} disabled={essential} onChange={e => edit(index, { required: e.target.checked })} /> Required</label>
                <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={q.hidden} disabled={essential} onChange={e => edit(index, { hidden: e.target.checked })} /> Hide this question</label>
              </div>
              {!!q.options.length && <fieldset className="min-w-0 space-y-3"><legend className="text-sm font-semibold text-slate-800">Answer choices</legend>
                <p className="text-sm text-slate-600">{q.type === "checks" && q.required && !custom ? "Guests must agree to every listed item." : "Use clear, distinct choices."}</p>
                {q.options.map((option, oi) => <div key={option.value} className="flex min-w-0 items-end gap-2">
                  <label className="min-w-0 flex-1 text-sm text-slate-700">Choice {oi + 1}<textarea value={option.label} maxLength={1000} rows={2} onChange={e => edit(index, { options: q.options.map((o, i) => i === oi ? { ...o, label: e.target.value } : o) })} className={input} /></label>
                  {custom && <button type="button" aria-label={`Remove choice ${oi + 1}`} className={button} onClick={() => edit(index, { options: q.options.filter((_, i) => i !== oi) })}>Remove</button>}
                </div>)}
              </fieldset>}
              {custom && ["radio", "checks"].includes(q.type) && <button type="button" disabled={q.options.length >= 40} className={button} onClick={() => edit(index, { options: [...q.options, { value: crypto.randomUUID(), label: "New choice" }] })}>Add choice</button>}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className={button} aria-label={`Move question ${index + 1} up`}>Move up</button>
                <button type="button" disabled={index === questions.length - 1} onClick={() => move(index, 1)} className={button} aria-label={`Move question ${index + 1} down`}>Move down</button>
                {custom ? <button type="button" onClick={() => change(questions.filter((_, i) => i !== index))} className={button}>Remove question</button>
                  : <button type="button" onClick={() => edit(index, defaults.find(d => d.id === q.id)!)} className={button}>Restore this question</button>}
              </div>
            </div>
          </details>;
        })}
        <div className="rounded-2xl border border-dashed border-slate-300 p-5">
          <h2 className="text-lg font-semibold text-slate-950">Add a question</h2>
          <p className="mt-1 text-sm text-slate-600">Choose an answer type, then edit the new question below.</p>
          <div className="mt-3 flex flex-wrap gap-2">{Object.entries(types).map(([type, label]) => <button key={type} type="button" disabled={questions.length >= 100} className={button} onClick={() => {
            setSearch("");
            change([...questions, { id: `custom_${crypto.randomUUID().replaceAll("-", "")}`, label: "New question", section: "Additional questions", help: "", type: type as IntakeQuestion["type"], required: false, hidden: false, options: ["radio", "checks"].includes(type) ? [{ value: "choice1", label: "First choice" }, { value: "choice2", label: "Second choice" }] : [] }]);
          }}>Add {label.toLowerCase()}</button>)}</div>
        </div>
      </fieldset>
    </>}
  </div>;
}
