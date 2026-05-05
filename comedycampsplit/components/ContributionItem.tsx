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
    <div className="bg-white rounded-xl border border-purple-100 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{item.title}</h3>
            {item.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-700">
                {item.category}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
          )}
          {item.users.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.users.map((uc) => (
                <span
                  key={uc.userId}
                  className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100"
                >
                  {uc.user.username ? `@${uc.user.username}` : uc.user.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <form action={handleToggle}>
          <button
            type="submit"
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isSignedUp
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
            }`}
          >
            {isSignedUp ? "Leave" : "Join"}
          </button>
        </form>
      </div>
    </div>
  );
}
