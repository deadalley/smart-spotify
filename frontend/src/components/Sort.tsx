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
    <div className="flex items-center gap-2">
      <ArrowUpDown size={16} className="text-zinc-400" />
      <span className="text-zinc-400 text-sm">Sort by:</span>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as SortOption)}
        className="select select-sm w-32"
      >
        <option value="name">Name</option>
        <option value="trackCount">Tracks</option>
      </select>

      <button
        onClick={() =>
          setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        }
        className="btn btn-sm"
        title={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
      >
        {sortDirection === "asc" ? (
          <ArrowUp size={14} />
        ) : (
          <ArrowDown size={14} />
        )}
        <span className="text-xs">
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
