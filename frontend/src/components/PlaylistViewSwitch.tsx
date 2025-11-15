import { Playlist } from "@smart-spotify/shared";
import { Grid } from "./Grid";
import { PlaylistList } from "./PlaylistList";
import { PlaylistTile } from "./PlaylistTile";

export function PlaylistViewSwitch({
  view,
  playlists,
}: {
  view: "grid" | "list";
  playlists: Playlist[];
}) {
  if (view === "list") {
    return <PlaylistList playlists={playlists} />;
  }

  return (
    <Grid>
      {playlists.map((playlist) => (
        <PlaylistTile key={playlist.id} playlist={playlist} />
      ))}
    </Grid>
  );
}
