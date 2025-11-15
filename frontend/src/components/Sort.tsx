import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export type SortOption = "name" | "trackCount" | "type";
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
    <div className="flex items-center gap-2 bg-base-300">
      <ArrowUpDown size={14} className="text-base-content/40 shrink-0" />
      <span className="text-base-content/50 text-xs font-medium uppercase tracking-wider shrink-0">
        Sort by:
      </span>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as SortOption)}
        className="select select-sm bg-base-300"
        style={{ boxShadow: "none" }}
      >
        <option value="name">Name</option>
        <option value="trackCount">Tracks</option>
        <option value="type">Type</option>
      </select>

      <div className="divider" />

      <button
        onClick={() =>
          setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        }
        className="btn btn-outline btn-sm"
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
          {sortBy === "type" && (
            <span>{sortDirection === "asc" ? "A-Z" : "Z-A"}</span>
          )}
        </span>
      </button>
    </div>
  );
}
