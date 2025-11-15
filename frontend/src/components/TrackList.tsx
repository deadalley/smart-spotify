import { Track, TrackAggregationResult } from "@smart-spotify/shared";
import { Clock } from "lucide-react";
import { TrackRow } from "./TrackRow";

export function TrackList({
  tracks,
  aggregatedTracks,
}: {
  tracks: Track[];
  aggregatedTracks?: TrackAggregationResult[];
}) {
  return (
    <div className="bg-base-200 shadow-xl">
      <div className="p-0">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-900 text-base-content/60 text-sm font-medium bg-zinc-900">
          <div className="col-span-1">#</div>
          <div className="col-span-6">TITLE</div>
          <div className="col-span-3">ALBUM</div>
          <div className="col-span-2 flex items-center justify-end">
            <Clock size={16} />
          </div>
        </div>

        <div className="overflow-y-auto">
          {aggregatedTracks
            ? aggregatedTracks.map((analysisResult, index) => (
                <TrackRow
                  key={`${analysisResult.track.id}-${index}`}
                  track={analysisResult.track}
                  index={index}
                  analysisResult={analysisResult}
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
