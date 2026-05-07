"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postComment, deleteComment, toggleReaction, REACTION_EMOJIS } from "@/app/actions/board";

interface Reaction {
  emoji: string;
  userId: string;
}

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
  reactions: Reaction[];
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
  const [reacting, setReacting] = useState<string | null>(null);

  // Pick a placeholder + label once per mount — feels alive, not random per keystroke.
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

  async function handleReact(commentId: string, emoji: string) {
    setReacting(commentId + emoji);
    const result = await toggleReaction(commentId, emoji);
    setReacting(null);
    if (result?.error) {
      setError(result.error);
      return;
    }
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
        <div className="flex items-center justify-between mt-2">
          <p className={`text-xs ${remaining < 100 ? "text-amber-700" : "text-stone-400"}`}>
            {remaining} characters left
          </p>
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="px-4 py-1.5 bg-stone-900 text-white rounded-md text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
          >
            {submitting ? "Sending…" : postLabel}
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center">
          <p className="text-3xl">🎪</p>
          <p className="text-stone-700 mt-3 font-medium">Empty board.</p>
          <p className="text-stone-500 text-sm mt-1">Be the first to post — set the tone.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => {
            const isMine = c.user.id === currentUserId;
            const initials = c.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

            // Aggregate reactions: { emoji → { count, mine } }
            const tally: Record<string, { count: number; mine: boolean }> = {};
            for (const r of c.reactions) {
              if (!tally[r.emoji]) tally[r.emoji] = { count: 0, mine: false };
              tally[r.emoji].count += 1;
              if (r.userId === currentUserId) tally[r.emoji].mine = true;
            }

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
                    <div className="flex items-center justify-between gap-3">
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

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {REACTION_EMOJIS.map((emoji) => {
                        const t = tally[emoji];
                        const count = t?.count ?? 0;
                        const mine = t?.mine ?? false;
                        const busy = reacting === c.id + emoji;
                        // Only show the "all six" rail if the post has zero reactions
                        // OR this is one of the existing reactions. Hides clutter for
                        // posts that already have a reaction set.
                        const shown = count > 0 || Object.keys(tally).length === 0;
                        if (!shown) return null;
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReact(c.id, emoji)}
                            disabled={busy}
                            className={`text-sm px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50 ${
                              mine
                                ? "bg-amber-100 border-amber-300 text-amber-900"
                                : "bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-700"
                            }`}
                            title={mine ? "Remove reaction" : "React"}
                          >
                            <span className="mr-1">{emoji}</span>
                            {count > 0 && <span className="tabular-nums text-xs font-medium">{count}</span>}
                          </button>
                        );
                      })}
                      {/* If post has reactions, also render any unreacted emojis as a small "+ react" hover */}
                      {Object.keys(tally).length > 0 && (
                        <div className="flex gap-1 ml-1">
                          {REACTION_EMOJIS.filter((e) => !tally[e]).map((emoji) => {
                            const busy = reacting === c.id + emoji;
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReact(c.id, emoji)}
                                disabled={busy}
                                className="text-sm px-1.5 py-0.5 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors disabled:opacity-50"
                                title="React"
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
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
