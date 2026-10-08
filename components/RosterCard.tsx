import { UserStatus } from "@prisma/client";
import { StatusBadge } from "./StatusBadge";

interface RosterCardProps {
  user: {
    id: string;
    name: string;
    username: string | null;
    bio: string | null;
    avatarUrl: string | null;
    status: UserStatus;
    contributions: {
      contribution: { title: string; category: string | null };
    }[];
  };
}

export function RosterCard({ user }: RosterCardProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-w-0 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex-shrink-0">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border border-slate-300"
            />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-semibold text-base sm:text-lg border border-indigo-100">
              {initials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-slate-900 text-base sm:text-lg break-words">{user.name}</h3>
            <StatusBadge status={user.status} />
          </div>
          {user.username && <p className="text-sm text-slate-600 break-words">@{user.username}</p>}
          {user.bio && (
            <p className="text-sm text-slate-700 mt-2 line-clamp-3 break-words leading-relaxed">{user.bio}</p>
          )}
          {user.contributions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {user.contributions.map((uc, i) => (
                <span
                  key={i}
                  className="inline-flex max-w-full items-center break-words px-2.5 py-1 rounded-lg text-xs bg-indigo-50 text-indigo-700"
                >
                  {uc.contribution.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
