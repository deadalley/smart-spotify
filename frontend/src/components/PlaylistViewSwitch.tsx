import { Playlist, TrackAggregationResult } from "@smart-spotify/shared";
import { Grid } from "./Grid";
import { PlaylistList } from "./PlaylistList";
import { PlaylistTile } from "./PlaylistTile";

export function PlaylistViewSwitch({
  view,
  playlists,
  trackAnalysisResult,
}: {
  view: "grid" | "list";
  playlists: Playlist[];
  trackAnalysisResult?: TrackAggregationResult;
}) {
  if (view === "list") {
    return (
      <PlaylistList
        playlists={playlists}
        trackAnalysisResult={trackAnalysisResult}
      />
    );
  }

  return (
    <Grid>
      {playlists.map((playlist) => (
        <PlaylistTile key={playlist.id} playlist={playlist} />
      ))}
    </Grid>
  );
}
