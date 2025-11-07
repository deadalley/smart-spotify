import { Artist } from "@smart-spotify/shared";
import { useMemo, useState } from "react";
import { ArtistTile } from "./ArtistTile";
import { Grid } from "./Grid";
import { Sort, SortDirection, SortOption } from "./Sort";

export function ArtistCollection({ artists }: { artists: Artist[] }) {
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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
      <Sort
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
      />

      <Grid>
        {sortedArtists.map((artist) => (
          <ArtistTile key={artist.id} artist={artist} />
        ))}
      </Grid>
    </>
  );
}
