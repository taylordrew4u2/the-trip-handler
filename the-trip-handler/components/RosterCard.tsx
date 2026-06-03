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
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-14 h-14 rounded-full object-cover border border-stone-300"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center font-medium text-lg border border-stone-300">
              {initials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-stone-900 text-lg">{user.name}</h3>
            <StatusBadge status={user.status} />
          </div>
          {user.username && <p className="text-sm text-stone-500">@{user.username}</p>}
          {user.bio && (
            <p className="text-sm text-stone-700 mt-2 line-clamp-3">{user.bio}</p>
          )}
          {user.contributions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {user.contributions.map((uc, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-stone-100 text-stone-700"
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
