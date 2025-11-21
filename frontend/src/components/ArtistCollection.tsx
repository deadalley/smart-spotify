import { Artist } from "@smart-spotify/shared";
import { useMemo, useState } from "react";
import { ArtistList } from "./ArtistList";
import { ArtistTile } from "./ArtistTile";
import { Grid } from "./Grid";
import { Sort, SortDirection, SortOption } from "./Sort";
import { TableSearch } from "./TableSearch";
import { ViewSwitch } from "./ViewSwitch";

export function ArtistCollection({ artists }: { artists: Artist[] }) {
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [globalFilter, setGlobalFilter] = useState("");

  const sortedAndFilteredArtists = useMemo(() => {
    if (!artists) return [];

    // Filter first
    let filtered = artists;
    if (globalFilter) {
      const lowerFilter = globalFilter.toLowerCase();
      filtered = artists.filter((artist) =>
        artist.name.toLowerCase().includes(lowerFilter)
      );
    }

    // Then sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a.trackCount - b.trackCount;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [artists, sortBy, sortDirection, globalFilter]);

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Sort
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortDirection={sortDirection}
          setSortDirection={setSortDirection}
        />
        <ViewSwitch view={view} setView={setView} />
      </div>

      <TableSearch
        value={globalFilter}
        onChange={setGlobalFilter}
        placeholder="Search artist..."
        className="mb-4"
      />

      {view === "grid" ? (
        <Grid>
          {sortedAndFilteredArtists.map((artist) => (
            <ArtistTile key={artist.id} artist={artist} />
          ))}
        </Grid>
      ) : (
        <ArtistList artists={sortedAndFilteredArtists} />
      )}
    </>
  );
}
