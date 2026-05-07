"use client";

import { useEffect, useState } from "react";
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
  createdAt: Date;
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
      if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "status") return a.status.localeCompare(b.status);
      return 0;
    });

  return (
    <div className="space-y-4">
      <SearchSort search={search} onSearchChange={setSearch} sort={sort} onSortChange={setSort} />
      {filtered.length === 0 ? (
        <p className="text-center text-stone-500 py-12 text-sm">No campers found.</p>
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
