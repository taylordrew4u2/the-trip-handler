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
    <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-purple-200"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg border-2 border-purple-200">
              {initials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-lg">{user.name}</h3>
            <StatusBadge status={user.status} />
          </div>
          {user.username && (
            <p className="text-sm text-purple-500">@{user.username}</p>
          )}
          {user.bio && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-3">{user.bio}</p>
          )}
          {user.contributions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {user.contributions.map((uc, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-200"
                >
                  🎭 {uc.contribution.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
