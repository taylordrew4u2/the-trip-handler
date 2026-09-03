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
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-stone-900">{item.title}</h3>
            {item.category && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                {item.category}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-stone-600 mt-1">{item.description}</p>
          )}
          {item.users.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.users.map((uc) => (
                <span
                  key={uc.userId}
                  className="text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-700"
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
            className={`inline-flex items-center justify-center w-full sm:w-auto px-4 min-h-[32px] rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              isSignedUp
                ? "border border-red-300 text-red-700 hover:bg-red-50"
                : "bg-stone-900 text-white hover:bg-stone-800"
            }`}
          >
            {isSignedUp ? "Leave" : "Join"}
          </button>
        </form>
      </div>
    </div>
  );
}
