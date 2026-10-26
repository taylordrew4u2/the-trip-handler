"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveIntakeQuestions } from "@/app/actions/intakeQuestions";
import { ESSENTIAL_QUESTIONS, fillIntakeAmounts, visibleQuestions, validateIntakeQuestions, type IntakeQuestion } from "@/lib/intakeQuestions";
import { IntakeQuestions } from "@/components/IntakeQuestions";

const input = "mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
const button = "min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-40";
const types = { text: "Short answer", textarea: "Long answer", radio: "Choose one", checkbox: "Agreement checkbox", checks: "Choose several" } as const;
const MAX_CHOICES = 40;
const AGREEMENTS = ["jokeProtectionAcks", "securityDepositAcks", "houseRulesAcks"];

const newChoice = (n: number) => ({ value: `custom_${crypto.randomUUID().replaceAll("-", "")}`, label: `Choice ${n}` });
const isChoice = (q: IntakeQuestion) => q.type === "radio" || q.type === "checks";

export function IntakeEditor({ tripId, initial, defaults, off, deposit }: { tripId: string; initial: IntakeQuestion[]; defaults: IntakeQuestion[]; off: string[]; deposit: number }) {
  const [questions, setQuestions] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [search, setSearch] = useState("");
  const [choiceCount, setChoiceCount] = useState(2);
  function change(next: IntakeQuestion[]) { setQuestions(next); setSaved(false); setDirty(true); }
  function edit(index: number, patch: Partial<IntakeQuestion>) { change(questions.map((q, i) => i === index ? { ...q, ...patch } : q)); }
  function move(index: number, offset: number) {
    const next = [...questions];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    change(next);
  }
  function setChoices(index: number, count: number) {
    const q = questions[index];
    const n = Math.max(1, Math.min(MAX_CHOICES, Math.floor(count) || 1));
    const options = n <= q.options.length ? q.options.slice(0, n)
      : [...q.options, ...Array.from({ length: n - q.options.length }, (_, i) => newChoice(q.options.length + i + 1))];
    edit(index, { options });
  }

  // Suggested questions not on the form yet, skipping sections this trip has turned off.
  const library = defaults.filter(d => !questions.some(q => q.id === d.id) && (!d.when || !off.includes(d.when)));
  const librarySections = [...new Set(library.map(q => q.section))];

  return <div className="space-y-5">
    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 text-sm leading-6 text-teal-950">
      <p><strong>How it works:</strong> your form only asks what you add. Pick questions from the suggestions below or write your own. For choice questions, set how many choices there are and word each one.</p>
      <p className="mt-2">Name and phone number always stay on the form so applications can be identified. Use {"{deposit}"} in text to show the trip’s current deposit amount. <Link href="/help#organizers" className="inline-flex min-h-11 items-center font-semibold underline">Organizer help</Link></p>
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
      }} className="min-h-11 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save questions"}</button>
      <button type="button" onClick={() => setPreview(!preview)} className={button}>{preview ? "Back to editing" : "Preview guest form"}</button>
      <span className="text-sm text-slate-600">{visibleQuestions(questions, off).length} questions on the form · {dirty ? "Unsaved changes" : "No unsaved changes"}</span>
      {saved && <p role="status" className="w-full text-sm text-green-800">Questions saved. New submissions will use these questions.</p>}
      {error && <p role="alert" className="w-full text-sm text-red-800">{error}</p>}
    </div>
    {preview ? <div>
      <p className="mb-4 text-sm text-slate-600">This preview includes your unsaved changes. Controls are disabled so no application is submitted.</p>
      <fieldset disabled><legend className="sr-only">Guest form preview</legend><IntakeQuestions questions={visibleQuestions(fillIntakeAmounts(questions, deposit), off)} /></fieldset>
    </div> : <>
      {questions.length > 4 && <label className="block text-sm font-medium text-slate-800">Find a question<input type="search" value={search} onChange={e => setSearch(e.target.value)} className={input} placeholder="Search question text or section" /></label>}
      <fieldset disabled={pending} className="min-w-0 space-y-3">
        <legend className="text-lg font-semibold text-slate-950">Your form</legend>
        {questions.map((q, index) => {
          if (search && !`${q.label} ${q.section}`.toLowerCase().includes(search.toLowerCase())) return null;
          const essential = ESSENTIAL_QUESTIONS.includes(q.id);
          const builtIn = defaults.find(d => d.id === q.id);
          const inactive = q.when && off.includes(q.when);
          return <details key={q.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <summary className="min-h-11 cursor-pointer break-words text-sm font-semibold leading-6 text-slate-950">{index + 1}. {q.label} <span className="font-normal text-slate-600">· {inactive ? "Section is off" : q.hidden ? "Hidden" : q.required ? "Required" : "Optional"}{isChoice(q) ? ` · ${q.options.length} choice${q.options.length === 1 ? "" : "s"}` : ""}</span></summary>
            <div className="mt-4 grid min-w-0 gap-4">
              <label className="text-sm text-slate-700">Question text<input value={q.label} maxLength={500} onChange={e => edit(index, { label: e.target.value })} className={input} /></label>
              <label className="text-sm text-slate-700">Help text (optional)<textarea value={q.help} maxLength={2000} onChange={e => edit(index, { help: e.target.value })} rows={2} className={input} /></label>
              <label className="text-sm text-slate-700">Section heading<input value={q.section} maxLength={100} onChange={e => edit(index, { section: e.target.value })} className={input} /></label>
              <p className="text-sm text-slate-600">Answer type: {types[q.type]}</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={q.required} disabled={essential} onChange={e => edit(index, { required: e.target.checked })} /> Required</label>
                {q.hidden && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={q.hidden} onChange={e => edit(index, { hidden: e.target.checked })} /> Hide this question</label>}
              </div>
              {isChoice(q) && <fieldset className="min-w-0 space-y-3"><legend className="text-sm font-semibold text-slate-800">Answer choices</legend>
                <label className="block max-w-48 text-sm text-slate-700">Number of choices<input type="number" inputMode="numeric" min={1} max={MAX_CHOICES} value={q.options.length} onChange={e => { if (e.target.value !== "") setChoices(index, Number(e.target.value)); }} className={input} /></label>
                <p className="text-sm text-slate-600">{q.type === "checks" && q.required && AGREEMENTS.includes(q.id) ? "Guests must agree to every listed item." : "Use clear, distinct choices."}</p>
                {q.options.map((option, oi) => <div key={option.value} className="flex min-w-0 items-end gap-2">
                  <label className="min-w-0 flex-1 text-sm text-slate-700">Choice {oi + 1}<textarea value={option.label} maxLength={1000} rows={2} onChange={e => edit(index, { options: q.options.map((o, i) => i === oi ? { ...o, label: e.target.value } : o) })} className={input} /></label>
                  <button type="button" disabled={q.options.length <= 1} aria-label={`Remove choice ${oi + 1}`} className={button} onClick={() => edit(index, { options: q.options.filter((_, i) => i !== oi) })}>Remove</button>
                </div>)}
                <button type="button" disabled={q.options.length >= MAX_CHOICES} className={button} onClick={() => setChoices(index, q.options.length + 1)}>Add choice</button>
              </fieldset>}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className={button} aria-label={`Move question ${index + 1} up`}>Move up</button>
                <button type="button" disabled={index === questions.length - 1} onClick={() => move(index, 1)} className={button} aria-label={`Move question ${index + 1} down`}>Move down</button>
                {!essential && <button type="button" onClick={() => change(questions.filter((_, i) => i !== index))} className={button}>Remove question</button>}
                {builtIn && <button type="button" onClick={() => edit(index, builtIn)} className={button}>Reset to suggested wording</button>}
              </div>
            </div>
          </details>;
        })}

        <div className="rounded-2xl border border-dashed border-slate-300 p-5">
          <h2 className="text-lg font-semibold text-slate-950">Write your own question</h2>
          <p className="mt-1 text-sm text-slate-600">Choose an answer type, then open the new question above to word it.</p>
          <label className="mt-3 block max-w-48 text-sm text-slate-700">Choices for choice questions<input type="number" inputMode="numeric" min={1} max={MAX_CHOICES} value={choiceCount} onChange={e => e.target.value !== "" && setChoiceCount(Math.max(1, Math.min(MAX_CHOICES, Math.floor(Number(e.target.value)) || 1)))} className={input} /></label>
          <div className="mt-3 flex flex-wrap gap-2">{Object.entries(types).map(([type, label]) => <button key={type} type="button" disabled={questions.length >= 100} className={button} onClick={() => {
            setSearch("");
            change([...questions, { id: `custom_${crypto.randomUUID().replaceAll("-", "")}`, label: "New question", section: "Additional questions", help: "", type: type as IntakeQuestion["type"], required: false, hidden: false,
              options: ["radio", "checks"].includes(type) ? Array.from({ length: choiceCount }, (_, i) => newChoice(i + 1)) : [] }]);
          }}>Add {label.toLowerCase()}</button>)}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-950">Suggested questions</h2>
            {library.length > 0 && <button type="button" disabled={questions.length + library.length > 100} className={button} onClick={() => change([...questions, ...library])}>Add all {library.length}</button>}
          </div>
          {library.length === 0 ? <p className="mt-2 text-sm text-slate-600">Every suggested question is already on your form.</p>
            : <div className="mt-3 space-y-4">{librarySections.map(section => <div key={section}>
              <h3 className="text-sm font-semibold text-slate-800">{section}</h3>
              <ul className="mt-2 space-y-2">{library.filter(q => q.section === section).map(q => <li key={q.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                <span className="min-w-0 break-words text-sm text-slate-800">{fillIntakeAmounts([q], deposit)[0].label} <span className="text-slate-500">· {types[q.type]}{isChoice(q) ? `, ${q.options.length} choices` : ""}</span></span>
                <button type="button" disabled={questions.length >= 100} className={button} aria-label={`Add: ${q.label}`} onClick={() => { setSearch(""); change([...questions, q]); }}>Add</button>
              </li>)}</ul>
            </div>)}</div>}
        </div>

        {questions.length > 2 && <button type="button" className={button} onClick={() => {
          if (confirm("Remove every question except name and phone number?")) change(questions.filter(q => ESSENTIAL_QUESTIONS.includes(q.id)));
        }}>Start over with a blank form</button>}
      </fieldset>
    </>}
  </div>;
}
