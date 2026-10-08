"use client";

import { signUpForContribution, removeContribution } from "@/app/actions/contributions";

interface ContributionItemProps {
  item: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    users: {
      userId: string;
      user: { name: string; username: string | null };
      notes: string | null;
    }[];
  };
  currentUserId: string;
}

export function ContributionItem({ item, currentUserId }: ContributionItemProps) {
  const isSignedUp = item.users.some((u) => u.userId === currentUserId);

  async function handleToggle() {
    if (isSignedUp) {
      await removeContribution(currentUserId, item.id);
    } else {
      await signUpForContribution(currentUserId, item.id);
    }
  }

  return (
    <div className="min-w-0 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 break-words">{item.title}</h3>
            {item.category && (
              <span className="text-xs px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700">
                {item.category}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-slate-600 mt-1">{item.description}</p>
          )}
          {item.users.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.users.map((uc) => (
                <span
                  key={uc.userId}
                  className="text-xs px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700"
                >
                  {uc.user.username ? `@${uc.user.username}` : uc.user.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <form action={handleToggle} className="shrink-0">
          <button
            type="submit"
            className={`min-w-[44px] inline-flex items-center justify-center w-full sm:w-auto px-4 min-h-[44px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              isSignedUp
                ? "border border-red-300 text-red-700 hover:bg-red-50"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {isSignedUp ? "Leave" : "Join"}
          </button>
        </form>
      </div>
    </div>
  );
}
