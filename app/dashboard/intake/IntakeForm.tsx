"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GuestForm } from "@prisma/client";
import { submitGuestForm, requestFormEditAccess } from "@/app/actions/guestForm";
import { IntakeQuestions } from "@/components/IntakeQuestions";
import { readIntakeSnapshot, type IntakeQuestion, type IntakeAnswers } from "@/lib/intakeQuestions";

export function IntakeForm({ defaultEmail, defaultName, defaultPhone, existing, isPending = false, questions }: {
  defaultEmail: string; defaultName: string; defaultPhone: string; existing: GuestForm | null;
  isPending?: boolean; questions: IntakeQuestion[];
}) {
  const router = useRouter();
  const errorRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [editRequested, setEditRequested] = useState(existing?.editRequested ?? false);
  const locked = Boolean(existing?.locked) || submitted;
  const snapshot = readIntakeSnapshot(existing?.intakeSnapshot);
  const shownQuestions = locked && snapshot ? snapshot.questions.filter(q => !q.hidden) : questions;
  const answers = {
    fullName: defaultName, phoneNumber: defaultPhone,
    ...Object.fromEntries(questions.map(q => [q.id, existing?.[q.id as keyof GuestForm] ?? (q.id === "fullName" ? defaultName : q.id === "phoneNumber" ? defaultPhone : null)])),
    ...snapshot?.answers,
  } as IntakeAnswers;

  async function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function requestEdit() {
    setBusy(true);
    setError("");
    try {
      const result = await requestFormEditAccess();
      if (result.error) await showError(result.error);
      else { setEditRequested(true); router.refresh(); }
    } catch { await showError("We could not request changes. Please try again."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 text-sm leading-6 text-teal-950">
      <p><strong>Before you start:</strong> answer the required questions, then choose Submit for review. The organizer decides who joins.</p>
      <p className="mt-2">Your answers go to the trip organizer. They are not shown on the group roster. Answers are saved when you submit; keep this page open until you finish.</p>
      <p className="mt-2">Signed in as <span className="break-all">{defaultEmail}</span>. <Link href="/help#guest-form" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Help with this form</Link></p>
    </div>
    {error && <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {locked && <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6">
      <p className="font-semibold text-slate-950">Your form has been submitted</p>
      <p className="text-slate-600">{editRequested ? "The organizer has your request to make changes. You can edit after they unlock the form." : "You can read your answers below. To change them, ask the organizer to unlock your form."}</p>
      {!editRequested && <button type="button" disabled={busy} onClick={requestEdit} className="mt-3 min-h-11 rounded-xl border border-slate-300 px-4 font-medium disabled:opacity-50">{busy ? "Sending…" : "Request changes"}</button>}
      <Link href="/dashboard" className="ml-3 inline-flex min-h-11 items-center text-teal-800 underline">Back to dashboard</Link>
    </div>}
    <form onSubmit={async e => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      setBusy(true); setError("");
      try {
        const result = await submitGuestForm(data);
        if (result.error) { await showError(result.error); return; }
        setSubmitted(true);
        if (isPending) router.push("/dashboard");
        else router.refresh();
      } catch { await showError("Your form was not saved. Please try again. Your answers are still on this page."); }
      finally { setBusy(false); }
    }}>
      <fieldset disabled={locked || busy} className="min-w-0">
        <legend className="sr-only">Guest form questions</legend>
        <IntakeQuestions questions={shownQuestions} answers={answers} />
      </fieldset>
      {!locked && <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <p>Review your answers before submitting. After you submit, the organizer can unlock your form if you need to make changes.</p>
        <button type="submit" disabled={busy} className="mt-3 min-h-12 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Submitting…" : "Submit for review"}</button>
      </div>}
    </form>
  </div>;
}
