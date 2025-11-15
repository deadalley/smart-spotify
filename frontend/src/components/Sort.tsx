import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export type SortOption = "name" | "trackCount";
export type SortDirection = "asc" | "desc";

export function Sort({
  sortBy,
  setSortBy,
  sortDirection,
  setSortDirection,
}: {
  sortBy: SortOption;
  setSortBy: (value: SortOption) => void;
  sortDirection: SortDirection;
  setSortDirection: (value: SortDirection) => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-base-200 border border-zinc-800/50 rounded-lg px-3 py-2 whitespace-nowrap">
      <ArrowUpDown size={14} className="text-base-content/40 shrink-0" />
      <span className="text-base-content/50 text-xs font-medium uppercase tracking-wider shrink-0">
        Sort by:
      </span>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as SortOption)}
        className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium text-base-content min-w-20 h-auto py-0 pr-6 cursor-pointer appearance-none"
        style={{ boxShadow: "none" }}
      >
        <option value="name">Name</option>
        <option value="trackCount">Tracks</option>
      </select>

      <div className="w-px h-4 bg-zinc-800/50 shrink-0" />

      <button
        onClick={() =>
          setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        }
        className="flex items-center gap-1.5 hover:text-primary transition-colors text-base-content/70 shrink-0"
        title={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
      >
        {sortDirection === "asc" ? (
          <ArrowUp size={14} />
        ) : (
          <ArrowDown size={14} />
        )}
        <span className="text-xs font-medium">
          {sortBy === "name" && (
            <span>{sortDirection === "asc" ? "A-Z" : "Z-A"}</span>
          )}
          {sortBy === "trackCount" && (
            <span>{sortDirection === "asc" ? "0-9" : "9-0"}</span>
          )}
        </span>
      </button>
    </div>
  );
}
