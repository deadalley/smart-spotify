import { Artist } from "@smart-spotify/shared";
import { useMemo, useState } from "react";
import { ArtistList } from "./ArtistList";
import { ArtistTile } from "./ArtistTile";
import { Grid } from "./Grid";
import { Sort, SortDirection, SortOption } from "./Sort";
import { ViewSwitch } from "./ViewSwitch";

export function ArtistCollection({ artists }: { artists: Artist[] }) {
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [view, setView] = useState<"grid" | "list">("grid");

  const sortedArtists = useMemo(() => {
    if (!artists) return [];

    return [...artists].sort((a, b) => {
      let comparison = 0;

      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a.trackCount - b.trackCount;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [artists, sortBy, sortDirection]);

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

      {view === "grid" ? (
        <Grid>
          {sortedArtists.map((artist) => (
            <ArtistTile key={artist.id} artist={artist} />
          ))}
        </Grid>
      ) : (
        <ArtistList artists={sortedArtists} />
      )}
    </>
  );
}
