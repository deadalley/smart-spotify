import { Playlist, Track, TrackAggregationResult } from "@smart-spotify/shared";
import { Clock } from "lucide-react";
import { TrackRow } from "./TrackRow";

export function TrackList({
  tracks,
  aggregatedTracks,
  playlists,
}: {
  tracks: Track[];
  aggregatedTracks?: TrackAggregationResult[];
  playlists?: Playlist[];
}) {
  return (
    <div className="bg-base-300 rounded-lg overflow-hidden border border-zinc-800/50">
      <div className="p-0">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-zinc-800/50 text-base-content/50 text-xs font-medium uppercase tracking-wider bg-base-300/50">
          <div className="col-span-1">#</div>
          <div className="col-span-6">Title</div>
          <div className="col-span-3">Album</div>
          <div className="col-span-2 flex items-center justify-end">
            <Clock size={14} />
          </div>
        </div>

        <div className="overflow-y-auto">
          {aggregatedTracks
            ? aggregatedTracks.map((trackAnalysisResult, index) => (
                <TrackRow
                  key={`${trackAnalysisResult.track.id}-${index}`}
                  track={trackAnalysisResult.track}
                  index={index}
                  trackAnalysisResult={trackAnalysisResult}
                  playlists={playlists}
                />
              ))
            : tracks.map((track, index) => {
                return (
                  <TrackRow
                    key={`${track.id}-${index}`}
                    track={track}
                    index={index}
                  />
                );
              })}
        </div>
      </div>
    </div>
  );
}
