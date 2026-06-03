"use client";

interface SearchSortProps {
  search: string;
  onSearchChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
}

export function SearchSort({ search, onSearchChange, sort, onSortChange }: SearchSortProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <input
        type="text"
        placeholder="Search campers…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
      />
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
      >
        <option value="name">Sort A–Z</option>
        <option value="newest">Newest first</option>
        <option value="status">By status</option>
      </select>
    </div>
  );
}
