"use client";

import { useId } from "react";
import type { IntakeQuestion, IntakeAnswers } from "@/lib/intakeQuestions";

const control = "min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15";

export function IntakeQuestionField({ question: q, value }: { question: IntakeQuestion; value?: IntakeAnswers[string] }) {
  const id = useId();
  const help = q.help ? `${id}-help` : undefined;
  const label = <>{q.label} <span className="text-xs text-slate-600">({q.required ? "Required" : "Optional"})</span></>;
  const hint = q.help && <p id={help} className="mt-1 text-sm leading-6 text-slate-600">{q.help}</p>;
  if (q.type === "radio" || q.type === "checks") {
    const selected = Array.isArray(value) ? value : [];
    return <fieldset aria-describedby={help} className="min-w-0">
      <legend className="text-sm font-medium text-slate-900">{label}</legend>
      {hint}
      <div className="mt-2 grid gap-2">
        {q.options.map((option, i) => <label key={option.value} className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800">
          <input type={q.type === "radio" ? "radio" : "checkbox"} name={q.type === "checks" ? `${q.id}[]` : q.id}
            value={option.value} defaultChecked={q.type === "radio" ? value === option.value : selected.includes(option.value)}
            required={q.type === "radio" ? q.required && i === 0 : q.required && ["jokeProtectionAcks", "securityDepositAcks", "houseRulesAcks"].includes(q.id)}
            className="mt-1 h-4 w-4 shrink-0 accent-indigo-600" />
          <span>{option.label}</span>
        </label>)}
      </div>
    </fieldset>;
  }
  if (q.type === "checkbox") return <div>
    <label htmlFor={id} className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800">
      <input id={id} aria-describedby={help} type="checkbox" name={q.id} defaultChecked={value === true} required={q.required} className="mt-1 h-4 w-4 shrink-0 accent-indigo-600" />
      <span>{label}</span>
    </label>{hint}
  </div>;
  return <div className="min-w-0">
    <label htmlFor={id} className="text-sm font-medium text-slate-900">{label}</label>
    {hint}
    {q.type === "textarea"
      ? <textarea id={id} aria-describedby={help} name={q.id} defaultValue={typeof value === "string" ? value : ""} required={q.required} maxLength={10000} rows={3} className={`${control} mt-2`} />
      : <input id={id} aria-describedby={help} name={q.id} type={q.id === "phoneNumber" ? "tel" : "text"} defaultValue={typeof value === "string" ? value : ""} required={q.required} maxLength={10000} className={`${control} mt-2`} />}
  </div>;
}

export function IntakeQuestions({ questions, answers = {} }: { questions: IntakeQuestion[]; answers?: IntakeAnswers }) {
  // Preserve the admin's order, including questions moved between sections.
  const groups: { title: string; questions: IntakeQuestion[] }[] = [];
  for (const q of questions) {
    if (groups.at(-1)?.title !== q.section) groups.push({ title: q.section, questions: [] });
    groups.at(-1)!.questions.push(q);
  }
  return <div className="space-y-5">{groups.map((group, i) => <section key={`${group.title}-${i}`} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <h2 className="font-serif text-2xl font-medium text-slate-950">{group.title}</h2>
    <div className="mt-5 grid gap-5">{group.questions.map(q => <IntakeQuestionField key={q.id} question={q} value={answers[q.id]} />)}</div>
  </section>)}</div>;
}
