"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  upsertDay,
  deleteDay,
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  reorderItineraryItem,
  moveItineraryItemToDay,
  toggleItineraryItemPin,
} from "@/app/actions/itinerary";

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900";

interface ItemRow {
  id: string;
  time: string | null;
  title: string;
  description: string | null;
  location: string | null;
  notes: string | null;
  pinned: boolean;
  orderIndex: number;
}

interface DayWithItems {
  id: string;
  tripId: string;
  dayNumber: number;
  date: Date | string | null;
  title: string | null;
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
  notes: string | null;
  itineraryItems: ItemRow[];
}

interface DayFormProps {
  day: DayWithItems | null;
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
            placeholder="e.g. Friday"
            className={inputCls}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">BREAKFAST</label>
          <textarea name="breakfast" defaultValue={day?.breakfast ?? ""} rows={2} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">LUNCH</label>
          <textarea name="lunch" defaultValue={day?.lunch ?? ""} rows={2} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">DINNER</label>
          <textarea name="dinner" defaultValue={day?.dinner ?? ""} rows={2} className={`${inputCls} resize-none`} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">DAY-LEVEL NOTES</label>
        <textarea
          name="notes"
          defaultValue={day?.notes ?? ""}
          rows={2}
          placeholder="Anything that applies to the whole day"
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

export function AdminItineraryClient({
  tripId,
  days,
}: {
  tripId: string;
  days: DayWithItems[];
}) {
  const router = useRouter();
  const [editingDayId, setEditingDayId] = useState<string | "new" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const nextDayNumber = days.length > 0 ? Math.max(...days.map((d) => d.dayNumber)) + 1 : 1;

  async function handleDaySubmit(e: React.FormEvent<HTMLFormElement>) {
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
    setEditingDayId(null);
    router.refresh();
  }

  async function handleDeleteDay(id: string, dayNumber: number) {
    if (!confirm(`Delete Day ${dayNumber}? This also deletes all itinerary items and comments on that day.`)) return;
    await deleteDay(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {editingDayId !== "new" && (
        <button
          onClick={() => setEditingDayId("new")}
          className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800"
        >
          + Add a day
        </button>
      )}

      {editingDayId === "new" && (
        <DayForm
          day={null}
          nextDayNumber={nextDayNumber}
          submitting={submitting}
          error={error}
          onSubmit={handleDaySubmit}
          onCancel={() => setEditingDayId(null)}
        />
      )}

      {days.length === 0 && editingDayId !== "new" && (
        <p className="text-stone-500 text-sm">No days yet. Add one above.</p>
      )}

      {days.map((day) => (
        <div key={day.id}>
          {editingDayId === day.id ? (
            <DayForm
              day={day}
              nextDayNumber={nextDayNumber}
              submitting={submitting}
              error={error}
              onSubmit={handleDaySubmit}
              onCancel={() => setEditingDayId(null)}
            />
          ) : (
            <article className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-stone-500">
                    Day {day.dayNumber}
                    {day.date &&
                      ` · ${new Date(day.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}`}
                  </p>
                  <h3 className="font-serif text-lg font-medium text-stone-900 mt-1">
                    {day.title || `Day ${day.dayNumber}`}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingDayId(day.id)}
                    className="text-xs px-3 py-1 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100"
                  >
                    Edit day
                  </button>
                  <button
                    onClick={() => handleDeleteDay(day.id, day.dayNumber)}
                    className="text-xs px-3 py-1 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                  >
                    Delete day
                  </button>
                </div>
              </div>

              {day.notes && <p className="mt-2 text-sm text-stone-600 italic">{day.notes}</p>}

              <div className="mt-4 pt-4 border-t border-stone-100">
                <ItineraryItemsPanel day={day} allDays={days} />
              </div>
            </article>
          )}
        </div>
      ))}
    </div>
  );
}

function ItineraryItemsPanel({
  day,
  allDays,
}: {
  day: DayWithItems;
  allDays: DayWithItems[];
}) {
  const [adding, setAdding] = useState(false);
  const items = [...day.itineraryItems].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.orderIndex - b.orderIndex;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-stone-500">Itinerary items</p>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs px-3 py-1 bg-stone-900 text-white rounded-md hover:bg-stone-800"
          >
            + Add item
          </button>
        )}
      </div>

      {adding && (
        <ItineraryItemForm
          dayId={day.id}
          onDone={() => setAdding(false)}
        />
      )}

      {items.length === 0 && !adding && (
        <p className="text-xs text-stone-500 italic">No items yet.</p>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <ItineraryItemRow
              key={item.id}
              item={item}
              dayId={day.id}
              allDays={allDays}
              isFirst={idx === 0}
              isLast={idx === items.length - 1}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ItineraryItemForm({
  dayId,
  item,
  onDone,
}: {
  dayId: string;
  item?: ItemRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    if (!item) fd.append("dayId", dayId);
    const r = item
      ? await updateItineraryItem(item.id, fd)
      : await createItineraryItem(fd);
    setBusy(false);
    if (r?.error) {
      setError(r.error);
      return;
    }
    onDone();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-2"
    >
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="md:col-span-1">
          <label className="block text-[10px] font-medium text-stone-700 mb-1 tracking-wide">TIME</label>
          <input
            name="time"
            defaultValue={item?.time ?? ""}
            placeholder="e.g. 4:00 PM"
            className={inputCls}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] font-medium text-stone-700 mb-1 tracking-wide">TITLE *</label>
          <input
            name="title"
            required
            defaultValue={item?.title ?? ""}
            placeholder="e.g. Arrival / Check-in"
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-medium text-stone-700 mb-1 tracking-wide">LOCATION</label>
        <input
          name="location"
          defaultValue={item?.location ?? ""}
          placeholder="e.g. Rental house"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-stone-700 mb-1 tracking-wide">DESCRIPTION</label>
        <textarea
          name="description"
          defaultValue={item?.description ?? ""}
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-stone-700 mb-1 tracking-wide">NOTES</label>
        <textarea
          name="notes"
          defaultValue={item?.notes ?? ""}
          rows={2}
          placeholder="Optional"
          className={`${inputCls} resize-none`}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="text-xs px-3 py-1.5 bg-stone-900 text-white rounded-md font-medium hover:bg-stone-800 disabled:opacity-50"
        >
          {busy ? "Saving…" : item ? "Save" : "Add item"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs px-3 py-1.5 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ItineraryItemRow({
  item,
  dayId,
  allDays,
  isFirst,
  isLast,
}: {
  item: ItemRow;
  dayId: string;
  allDays: DayWithItems[];
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    await fn();
    setBusy(false);
    router.refresh();
  }

  async function handleMove(e: React.ChangeEvent<HTMLSelectElement>) {
    const target = e.target.value;
    if (!target || target === dayId) return;
    if (!confirm("Move this item to a different day?")) {
      e.target.value = "";
      return;
    }
    await run(() => moveItineraryItemToDay(item.id, target));
  }

  if (editing) {
    return (
      <li>
        <ItineraryItemForm
          dayId={dayId}
          item={item}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="border border-stone-200 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {item.time && (
              <span className="text-sm font-mono text-stone-700 tabular-nums">{item.time}</span>
            )}
            {item.time && <span className="text-stone-300">—</span>}
            <span className="font-medium text-stone-900">{item.title}</span>
            {item.pinned && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                Pinned
              </span>
            )}
          </div>
          {item.location && (
            <p className="text-xs text-stone-500 mt-0.5">Location: {item.location}</p>
          )}
          {item.description && (
            <p className="text-sm text-stone-700 mt-1 whitespace-pre-wrap">{item.description}</p>
          )}
          {item.notes && (
            <p className="text-xs text-stone-600 italic mt-1 whitespace-pre-wrap">{item.notes}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <button
            onClick={() => run(() => reorderItineraryItem(item.id, "up"))}
            disabled={busy || isFirst}
            className="text-xs px-2 py-1 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100 disabled:opacity-30"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            onClick={() => run(() => reorderItineraryItem(item.id, "down"))}
            disabled={busy || isLast}
            className="text-xs px-2 py-1 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100 disabled:opacity-30"
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            onClick={() => run(() => toggleItineraryItemPin(item.id))}
            disabled={busy}
            className={`text-xs px-2 py-1 rounded-md border ${
              item.pinned
                ? "border-amber-400 text-amber-900 bg-amber-50"
                : "border-stone-300 text-stone-700 hover:bg-stone-100"
            }`}
          >
            {item.pinned ? "Unpin" : "Pin"}
          </button>
          <select
            onChange={handleMove}
            defaultValue=""
            className="text-xs px-2 py-1 border border-stone-300 text-stone-700 rounded-md bg-white"
            disabled={busy}
            aria-label="Move to day"
          >
            <option value="">Move to…</option>
            {allDays
              .filter((d) => d.id !== dayId)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  Day {d.dayNumber}
                  {d.title ? ` · ${d.title}` : ""}
                </option>
              ))}
          </select>
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-2 py-1 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (!confirm("Delete this item?")) return;
              run(() => deleteItineraryItem(item.id));
            }}
            disabled={busy}
            className="text-xs px-2 py-1 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
