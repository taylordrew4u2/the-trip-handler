"use client";

import { useRouter } from "next/navigation";
import { deleteComment } from "@/app/actions/board";

interface Row {
  id: string;
  body: string;
  createdAt: Date;
  user: { id: string; name: string; username: string | null; avatarUrl: string | null };
  reactions: { emoji: string }[];
}

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

export function AdminBoardClient({ comments }: { comments: Row[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Delete this post? The author won't be notified.")) return;
    await deleteComment(id);
    router.refresh();
  }

  if (comments.length === 0) {
    return <p className="text-stone-500 text-sm">No posts yet.</p>;
  }

  return (
    <div className="space-y-3">
      {comments.map((c) => {
        const initials = c.user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        return (
          <div key={c.id} className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              {c.user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.user.avatarUrl} alt={c.user.name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center text-xs font-medium">
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
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs px-2 py-1 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm text-stone-800 mt-1 whitespace-pre-wrap break-words">{c.body}</p>
                {c.reactions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(
                      c.reactions.reduce<Record<string, number>>((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                        return acc;
                      }, {})
                    ).map(([emoji, count]) => (
                      <span key={emoji} className="text-xs px-2 py-0.5 rounded-full bg-stone-50 border border-stone-200">
                        {emoji} <span className="tabular-nums">{count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
