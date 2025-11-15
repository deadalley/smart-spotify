import { Playlist } from "@smart-spotify/shared";
import { useMemo, useState } from "react";
import { Grid } from "./Grid";
import { PlaylistList } from "./PlaylistList";
import { PlaylistTile } from "./PlaylistTile";
import { Sort, SortDirection, SortOption } from "./Sort";
import { ViewSwitch } from "./ViewSwitch";

export function PlaylistCollection({ playlists }: { playlists: Playlist[] }) {
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [view, setView] = useState<"grid" | "list">("grid");

  const sortedPlaylists = useMemo(() => {
    if (!playlists) return [];

    return [...playlists].sort((a, b) => {
      let comparison = 0;

      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a.trackCount - b.trackCount;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [playlists, sortBy, sortDirection]);

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
          {sortedPlaylists.map((playlist) => (
            <PlaylistTile key={playlist.id} playlist={playlist} />
          ))}
        </Grid>
      ) : (
        <PlaylistList playlists={sortedPlaylists} />
      )}
    </>
  );
}
