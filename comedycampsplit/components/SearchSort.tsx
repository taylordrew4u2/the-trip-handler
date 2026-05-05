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
        placeholder="Search campers..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 px-4 py-2 rounded-xl border border-purple-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
      />
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="px-4 py-2 rounded-xl border border-purple-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
      >
        <option value="name">Sort A–Z</option>
        <option value="newest">Newest First</option>
        <option value="status">By Status</option>
      </select>
    </div>
  );
}
