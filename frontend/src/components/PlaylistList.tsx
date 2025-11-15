import { Playlist, TrackAggregationResult } from "@smart-spotify/shared";
import { PlaylistRow } from "./PlaylistRow";

export function PlaylistList({
  playlists,
  trackAnalysisResult,
}: {
  playlists: Playlist[];
  trackAnalysisResult?: TrackAggregationResult;
}) {
  const { suggestedPlaylists } = trackAnalysisResult || {};

  return (
    <div className="bg-base-300 rounded-lg overflow-hidden border border-zinc-800/50 w-full flex flex-col h-full">
      <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-zinc-800/50 text-base-content/50 text-xs font-medium uppercase tracking-wider bg-base-300/50">
        {suggestedPlaylists ? (
          <>
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Tracks by Same Artists</div>
            <div className="col-span-2">Similar Genres</div>
            <div className="col-span-2"></div>
          </>
        ) : (
          <>
            <div className="col-span-10">Name</div>
            <div className="col-span-2">Type</div>
          </>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {suggestedPlaylists
          ? suggestedPlaylists.map((suggestedPlaylist, index) => (
              <PlaylistRow
                key={`${suggestedPlaylist.playlist.id}-${index}`}
                playlist={suggestedPlaylist.playlist}
                track={trackAnalysisResult?.track}
                suggestedPlaylist={suggestedPlaylist}
              />
            ))
          : playlists.map((playlist, index) => (
              <PlaylistRow
                key={`${playlist.id}-${index}`}
                playlist={playlist}
              />
            ))}
      </div>
    </div>
  );
}
