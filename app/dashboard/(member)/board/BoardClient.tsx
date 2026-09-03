"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postComment, deleteComment } from "@/app/actions/board";

interface CommentRow {
  id: string;
  body: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
  };
}

const MAX_LEN = 2000;

const PLACEHOLDERS = [
  "what's on your mind?",
  "drop a hot take",
  "share a half-formed bit",
  "spill",
  "shower thought, go",
  "say the thing you wouldn't tweet",
  "ask the group for advice",
  "loudly announce something",
];

const POST_LABELS = ["Send it", "Post it", "Drop it", "Yeet"];

function timeAgo(d: Date): string {
  const ms = Date.now() - new Date(d).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(d).toLocaleDateString();
}

export function BoardClient({ comments, currentUserId }: { comments: CommentRow[]; currentUserId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [placeholder] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  const [postLabel] = useState(() => POST_LABELS[Math.floor(Math.random() * POST_LABELS.length)]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!body.trim()) return;
    setSubmitting(true);
    const result = await postComment(body);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setBody("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    await deleteComment(id);
    router.refresh();
  }

  const remaining = MAX_LEN - body.length;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-sm">
            {error}
          </div>
        )}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={MAX_LEN}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-base resize-none focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 placeholder:text-stone-400"
        />
        <div className="flex items-center justify-between gap-3 mt-2">
          <p className={`text-xs ${remaining < 100 ? "text-amber-700" : "text-stone-400"}`}>
            {remaining} characters left
          </p>
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="inline-flex items-center justify-center shrink-0 px-4 min-h-[34px] bg-stone-900 text-white rounded-md text-sm font-medium hover:bg-stone-800 active:bg-stone-700 disabled:opacity-50"
          >
            {submitting ? "Sending…" : postLabel}
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center">
          <p className="text-stone-700 font-medium">Empty board.</p>
          <p className="text-stone-500 text-sm mt-1">Be the first to post — set the tone.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => {
            const isMine = c.user.id === currentUserId;
            const initials = c.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <div key={c.id} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
                <div className="flex items-start gap-3">
                  {c.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.user.avatarUrl} alt={c.user.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center text-sm font-medium">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                      <div className="text-sm">
                        <span className="font-medium text-stone-900">{c.user.name}</span>
                        {c.user.username && <span className="text-stone-400"> · @{c.user.username}</span>}
                        <span className="text-stone-400"> · {timeAgo(c.createdAt)}</span>
                      </div>
                      {isMine && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-xs text-stone-400 hover:text-red-700"
                          title="Delete"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="text-base text-stone-800 mt-1 whitespace-pre-wrap break-words leading-relaxed">{c.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
