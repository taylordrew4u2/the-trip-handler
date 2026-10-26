import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  INTAKE_FIELDS,
  PREFERENCE_FIELDS,
  activeFields,
  formatAnswer,
  type GuestField,
} from "@/lib/guestForm";
import { readIntakeSnapshot } from "@/lib/intakeQuestions";
import { UnlockFormButton } from "./UnlockFormButton";

export const dynamic = "force-dynamic";

/** The trip owner's read-only view of one applicant's guest form and preferences. */
export default async function ApplicantAnswersPage({
  params,
}: {
  params: Promise<{ tripId: string; userId: string }>;
}) {
  const { tripId, userId } = await params;
  const session = await getServerSession(authOptions);
  const ownerId = (session?.user as { id?: string } | undefined)?.id;
  if (!ownerId) redirect("/login");

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, ownerId },
    select: { id: true, name: true, disabledSections: true },
  });
  if (!trip) redirect("/dashboard/my-trips");

  // Only applicants of this trip; an id from another trip reads as missing.
  const applicant = await prisma.user.findFirst({
    where: { id: userId, tripId },
    select: { id: true, name: true, email: true, status: true, guestForm: true },
  });
  if (!applicant) redirect(`/dashboard/my-trips/${tripId}`);

  const form = applicant.guestForm as Record<string, unknown> | null;
  const off = trip.disabledSections;
  const snapshot = readIntakeSnapshot(form?.intakeSnapshot);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/dashboard/my-trips"
          className="inline-flex items-center min-h-[44px] -ml-1 px-1 text-sm font-medium text-slate-600 hover:text-teal-800"
        >
          ← My trips
        </Link>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-slate-950 break-words">
          {applicant.name}
        </h1>
        <p className="text-slate-600 text-sm mt-1 break-words">
          {applicant.email} · {applicant.status.replace("_", " ").toLowerCase()} · {trip.name}
        </p>
      </div>

      {!form ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-600">
          They haven&apos;t submitted the guest form yet.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">
              {form.locked
                ? form.editRequested
                  ? "Locked. They asked to make changes."
                  : "Locked after submission."
                : "Unlocked — they can edit and resubmit."}
            </p>
            {Boolean(form.locked) && <UnlockFormButton userId={applicant.id} requested={Boolean(form.editRequested)} />}
          </div>
          {snapshot ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="font-serif text-2xl font-medium text-slate-950">Guest form answers</h2>
              <p className="mt-2 text-sm text-slate-600">Questions are shown as they were when this person answered them.</p>
              <dl className="mt-4 divide-y divide-slate-100">{snapshot.questions.map(q => {
                const raw = snapshot.answers[q.id];
                const values = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
                const formatted = q.options.length && values.length ? values.map(v => q.options.find(o => o.value === v)?.label ?? v).join(", ") : formatAnswer(raw);
                return <div key={q.id} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
                  <dt className="text-sm text-slate-600">{q.label}{q.hidden && " (earlier question)"}</dt>
                  <dd className="whitespace-pre-wrap break-words text-sm text-slate-900">{formatted}</dd>
                </div>;
              })}</dl>
            </section>
          ) : <Answers title="Guest form" fields={activeFields(INTAKE_FIELDS, off)} form={form} />}
          {form.preferencesSubmittedAt ? (
            <Answers title="Preferences" fields={activeFields(PREFERENCE_FIELDS, off)} form={form} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-600">
              Preferences not filled in yet.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Answers({ title, fields, form }: { title: string; fields: GuestField[]; form: Record<string, unknown> }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6">
      <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-950 mb-4">{title}</h2>
      <dl className="divide-y divide-slate-100">
        {fields.map((f) => (
          <div key={f.name} className="grid gap-1 py-2.5 sm:grid-cols-[14rem_1fr] sm:gap-4">
            <dt className="text-sm text-slate-600">{f.label}</dt>
            <dd className="text-sm text-slate-900 whitespace-pre-wrap break-words">{formatAnswer(form[f.name])}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
