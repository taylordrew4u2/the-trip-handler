"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RosterCard } from "@/components/RosterCard";
import { SearchSort } from "@/components/SearchSort";
import { UserStatus } from "@prisma/client";

type RosterUser = {
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

export function RosterClientView({ initialUsers }: { initialUsers: RosterUser[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [users] = useState(initialUsers);

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  const filtered = users
    .filter((u) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.bio?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "status") return a.status.localeCompare(b.status);
      return 0;
    });

  return (
    <div className="space-y-4">
      <SearchSort
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
      />
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🎭</div>
          <p>No campers found yet!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((user) => (
            <RosterCard key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}
