"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createItineraryComment,
  updateItineraryComment,
  deleteItineraryComment,
} from "@/app/actions/itinerary";

interface CommentRow {
  id: string;
  body: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  user: { id: string; name: string };
}

interface ItemRow {
  id: string;
  time: string | null;
  title: string;
  description: string | null;
  location: string | null;
  notes: string | null;
  pinned: boolean;
  comments: CommentRow[];
}

interface DayRow {
  id: string;
  dayNumber: number;
  date: Date | string | null;
  title: string | null;
  notes: string | null;
  itineraryItems: ItemRow[];
}

export function ItineraryView({
  days,
  currentUserId,
  isAdmin,
  canComment,
}: {
  days: DayRow[];
  currentUserId: string;
  isAdmin: boolean;
  canComment: boolean;
}) {
  if (days.length === 0) {
    return <p className="text-stone-500 text-sm">Itinerary details coming soon.</p>;
  }

  return (
    <section className="space-y-6">
      <h2 className="text-xs uppercase tracking-[0.2em] text-stone-500">Schedule</h2>
      <div className="space-y-8">
        {days.map((day) => (
          <DaySection
            key={day.id}
            day={day}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            canComment={canComment}
          />
        ))}
      </div>
    </section>
  );
}

function DaySection({
  day,
  currentUserId,
  isAdmin,
  canComment,
}: {
  day: DayRow;
  currentUserId: string;
  isAdmin: boolean;
  canComment: boolean;
}) {
  const heading = day.title || `Day ${day.dayNumber}`;
  const dateStr = day.date
    ? new Date(day.date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <section>
      <header className="mb-3">
        <p className="text-xs uppercase tracking-[0.15em] text-stone-500">
          Day {day.dayNumber}
          {dateStr && ` · ${dateStr}`}
        </p>
        <h3 className="font-serif text-2xl font-medium text-stone-900 mt-0.5">{heading}</h3>
        {day.notes && <p className="text-sm text-stone-600 italic mt-1">{day.notes}</p>}
      </header>

      {day.itineraryItems.length === 0 ? (
        <p className="text-sm text-stone-500 italic">Nothing scheduled yet.</p>
      ) : (
        <div className="space-y-3">
          {day.itineraryItems.map((item) => (
            <ItineraryItemCard
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              canComment={canComment}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ItineraryItemCard({
  item,
  currentUserId,
  isAdmin,
  canComment,
}: {
  item: ItemRow;
  currentUserId: string;
  isAdmin: boolean;
  canComment: boolean;
}) {
  const [showComments, setShowComments] = useState(false);
  const commentCount = item.comments.length;

  return (
    <article className="bg-white rounded-xl border border-stone-200 p-4 md:p-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {item.time && (
              <span className="text-sm font-mono text-stone-700 tabular-nums">{item.time}</span>
            )}
            {item.time && <span className="text-stone-300">—</span>}
            <h4 className="font-medium text-stone-900">{item.title}</h4>
            {item.pinned && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                Pinned
              </span>
            )}
          </div>
          {item.location && (
            <p className="text-xs text-stone-500 mt-1">
              <span className="uppercase tracking-wide">Where</span> · {item.location}
            </p>
          )}
        </div>
      </header>

      {item.description && (
        <p className="text-sm text-stone-700 mt-2 whitespace-pre-wrap">{item.description}</p>
      )}

      {item.notes && (
        <p className="text-xs text-stone-600 italic mt-2 whitespace-pre-wrap">{item.notes}</p>
      )}

      <div className="mt-3 pt-3 border-t border-stone-100">
        <button
          onClick={() => setShowComments((s) => !s)}
          className="text-xs text-stone-600 hover:text-stone-900"
        >
          {showComments ? "Hide" : "Show"} comments ({commentCount})
        </button>
        {showComments && (
          <CommentsThread
            itemId={item.id}
            comments={item.comments}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            canComment={canComment}
          />
        )}
      </div>
    </article>
  );
}

function CommentsThread({
  itemId,
  comments,
  currentUserId,
  isAdmin,
  canComment,
}: {
  itemId: string;
  comments: CommentRow[];
  currentUserId: string;
  isAdmin: boolean;
  canComment: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError("");
    const r = await createItineraryComment(itemId, draft);
    setBusy(false);
    if (r && "error" in r) {
      setError(r.error);
      return;
    }
    setDraft("");
    router.refresh();
  }

  return (
    <div className="mt-3 space-y-3">
      {comments.length === 0 ? (
        <p className="text-xs text-stone-500 italic">No comments yet.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              canEdit={canComment && c.user.id === currentUserId}
              canDelete={canComment && (c.user.id === currentUserId || isAdmin)}
            />
          ))}
        </ul>
      )}

      {!canComment ? (
        <p className="text-xs text-stone-500 italic">
          Get approved to post comments here.
        </p>
      ) : (
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Add a comment…"
          className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 resize-none"
          disabled={busy}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div>
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="text-xs px-3 py-1.5 bg-stone-900 text-white rounded-md font-medium hover:bg-stone-800 disabled:opacity-40"
          >
            {busy ? "Posting…" : "Post comment"}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  canEdit,
  canDelete,
}: {
  comment: CommentRow;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ts = new Date(comment.createdAt);
  const tsLabel = ts.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  async function save() {
    if (!draft.trim()) return;
    setBusy(true);
    setError("");
    const r = await updateItineraryComment(comment.id, draft);
    setBusy(false);
    if (r && "error" in r) {
      setError(r.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this comment?")) return;
    setBusy(true);
    const r = await deleteItineraryComment(comment.id);
    setBusy(false);
    if (r && "error" in r) {
      setError(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className="bg-stone-50 rounded-md px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs">
          <span className="font-medium text-stone-900">{comment.user.name}</span>
          <span className="text-stone-400"> · {tsLabel}</span>
        </p>
        {!editing && (canEdit || canDelete) && (
          <div className="flex gap-2 text-[10px]">
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="text-stone-500 hover:text-stone-900"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={remove}
                disabled={busy}
                className="text-stone-500 hover:text-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="w-full px-2 py-1.5 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 resize-none"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={busy || !draft.trim()}
              className="text-xs px-2 py-1 bg-stone-900 text-white rounded-md hover:bg-stone-800 disabled:opacity-40"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setDraft(comment.body);
                setError("");
              }}
              className="text-xs px-2 py-1 border border-stone-300 text-stone-700 rounded-md hover:bg-stone-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-stone-800 mt-1 whitespace-pre-wrap">{comment.body}</p>
      )}
      {!editing && error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </li>
  );
}
