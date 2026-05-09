"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RosterCard } from "@/components/RosterCard";
import { SearchSort } from "@/components/SearchSort";
import { UserStatus } from "@prisma/client";
import { TRIP_CAPACITY } from "@/lib/pricing";

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

  // Render TRIP_CAPACITY fixed slots. Approved users fill from the top; the
  // rest render as "Open" placeholders so people can see what's left.
  const slots = Array.from({ length: TRIP_CAPACITY }, (_, i) => filtered[i] ?? null);
  const filledCount = filtered.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-stone-700 tabular-nums">
          <span className="font-medium">{filledCount}</span>
          <span className="text-stone-500"> / {TRIP_CAPACITY} slots filled</span>
          {filledCount < TRIP_CAPACITY && (
            <span className="text-stone-500"> · {TRIP_CAPACITY - filledCount} open</span>
          )}
        </p>
        <SearchSort search={search} onSearchChange={setSearch} sort={sort} onSortChange={setSort} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {slots.map((user, i) =>
          user ? (
            <RosterCard key={user.id} user={user} />
          ) : (
            <div
              key={`open-${i}`}
              className="bg-stone-50 border border-dashed border-stone-300 rounded-xl p-5 flex items-center justify-center"
            >
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.15em] text-stone-500">Slot {i + 1}</p>
                <p className="font-serif text-lg text-stone-700 mt-1">Open</p>
              </div>
            </div>
          )
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-stone-500 py-4 text-sm">No campers approved yet.</p>
      )}
    </div>
  );
}
