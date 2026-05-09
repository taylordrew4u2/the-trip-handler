"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertDay, deleteDay } from "@/app/actions/itinerary";
import type { Day } from "@prisma/client";

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900";

interface DayFormProps {
  day: Day | null;
  nextDayNumber: number;
  submitting: boolean;
  error: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

function DayForm({ day, nextDayNumber, submitting, error, onSubmit, onCancel }: DayFormProps) {
  return (
      <form onSubmit={onSubmit} className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
        {day?.id && <input type="hidden" name="id" value={day.id} />}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">DAY # *</label>
            <input
              type="number"
              name="dayNumber"
              min={1}
              defaultValue={day?.dayNumber ?? nextDayNumber}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">DATE</label>
            <input
              type="date"
              name="date"
              defaultValue={day?.date ? new Date(day.date).toISOString().split("T")[0] : ""}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">TITLE</label>
            <input
              name="title"
              defaultValue={day?.title ?? ""}
              placeholder="e.g. Arrival day"
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">SCHEDULE</label>
          <textarea
            name="schedule"
            defaultValue={day?.schedule ?? ""}
            rows={6}
            placeholder={"9:00 AM — Pickup\n10:30 AM — Drive begins\n2:00 PM — Arrival, room assignments\n4:00 PM — Workshop\n…"}
            className={`${inputCls} resize-y font-mono`}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">BREAKFAST</label>
            <textarea name="breakfast" defaultValue={day?.breakfast ?? ""} rows={2} className={`${inputCls} resize-none`} placeholder="What's for breakfast" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">LUNCH</label>
            <textarea name="lunch" defaultValue={day?.lunch ?? ""} rows={2} className={`${inputCls} resize-none`} placeholder="What's for lunch" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">DINNER</label>
            <textarea name="dinner" defaultValue={day?.dinner ?? ""} rows={2} className={`${inputCls} resize-none`} placeholder="What's for dinner" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">NOTES</label>
          <textarea
            name="notes"
            defaultValue={day?.notes ?? ""}
            rows={2}
            placeholder="Anything else (free time, what to bring, etc.)"
            className={`${inputCls} resize-none`}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
          >
            {submitting ? "Saving…" : day?.id ? "Update day" : "Add day"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-100"
          >
            Cancel
          </button>
        </div>
      </form>
  );
}

export function AdminItineraryClient({ tripId, days }: { tripId: string; days: Day[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const nextDayNumber = days.length > 0 ? Math.max(...days.map((d) => d.dayNumber)) + 1 : 1;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.append("tripId", tripId);
    const result = await upsertDay(fd);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string, dayNumber: number) {
    if (!confirm(`Delete Day ${dayNumber}?`)) return;
    await deleteDay(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {editingId !== "new" && (
        <button
          onClick={() => setEditingId("new")}
          className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800"
        >
          + Add a day
        </button>
      )}

      {editingId === "new" && (
        <DayForm
          day={null}
          nextDayNumber={nextDayNumber}
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
          onCancel={() => setEditingId(null)}
        />
      )}

      {days.length === 0 && editingId !== "new" && (
        <p className="text-stone-500 text-sm">No days yet. Add one above.</p>
      )}

      {days.map((day) => (
        <div key={day.id}>
          {editingId === day.id ? (
            <DayForm
              day={day}
              nextDayNumber={nextDayNumber}
              submitting={submitting}
              error={error}
              onSubmit={handleSubmit}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <article className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-stone-500">
                    Day {day.dayNumber}
                    {day.date && ` · ${new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`}
                  </p>
                  <h3 className="font-serif text-lg font-medium text-stone-900 mt-1">
                    {day.title || `Day ${day.dayNumber}`}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(day.id)}
                    className="text-xs px-3 py-1 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(day.id, day.dayNumber)}
                    className="text-xs px-3 py-1 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {day.schedule && (
                <pre className="mt-3 text-sm text-stone-700 whitespace-pre-wrap font-mono bg-stone-50 rounded-md p-3">
                  {day.schedule}
                </pre>
              )}
              {(day.breakfast || day.lunch || day.dinner) && (
                <dl className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  {day.breakfast && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-stone-500">Breakfast</dt>
                      <dd className="text-stone-700 mt-0.5 whitespace-pre-wrap">{day.breakfast}</dd>
                    </div>
                  )}
                  {day.lunch && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-stone-500">Lunch</dt>
                      <dd className="text-stone-700 mt-0.5 whitespace-pre-wrap">{day.lunch}</dd>
                    </div>
                  )}
                  {day.dinner && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-stone-500">Dinner</dt>
                      <dd className="text-stone-700 mt-0.5 whitespace-pre-wrap">{day.dinner}</dd>
                    </div>
                  )}
                </dl>
              )}
              {day.notes && (
                <p className="mt-3 text-sm text-stone-600 italic">{day.notes}</p>
              )}
            </article>
          )}
        </div>
      ))}
    </div>
  );
}
