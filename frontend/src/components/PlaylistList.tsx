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
    <div className="bg-base-200 shadow-xl w-full flex flex-col h-full">
      <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-900 text-base-content/60 text-sm font-medium bg-zinc-900">
        {suggestedPlaylists ? (
          <>
            <div className="col-span-6">NAME</div>
            <div className="col-span-3">SIMILAR ARTISTS</div>
            <div className="col-span-3">SIMILAR GENRES</div>
          </>
        ) : (
          <div className="col-span-12">NAME</div>
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
