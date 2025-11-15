import { Track, TrackAggregationResult } from "@smart-spotify/shared";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { formatDuration } from "../utils";
import { TrackAnalysisResult } from "./TrackAnalysisResult";

export function TrackRow({
  track,
  index,
  trackAnalysisResult,
}: {
  track: Track;
  index: number;
  trackAnalysisResult?: TrackAggregationResult;
}) {
  const [seeSuggestions, setSeeSuggestions] = useState(false);

  return (
    <>
      <div className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-base-100/30 transition-colors duration-150 group border-b border-zinc-800/30 last:border-b-0">
        <div className="col-span-1 flex items-center">
          <span className="text-base-content/50 text-sm group-hover:text-base-content/70 transition-colors">
            {index + 1}
          </span>
        </div>

        <div className="col-span-6 flex items-center">
          <div className="min-w-0 flex-1">
            <div className="flex gap-2 items-center">
              <p className="font-medium truncate text-base-content group-hover:text-primary transition-colors">
                {track.name}
              </p>
              {trackAnalysisResult && (
                <button
                  className="btn btn-ghost btn-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setSeeSuggestions(!seeSuggestions)}
                >
                  {seeSuggestions ? (
                    <ChevronUp size={12} />
                  ) : (
                    <ChevronDown size={12} />
                  )}
                </button>
              )}
            </div>
            <p className="text-base-content/50 text-sm truncate mt-0.5">
              {track.artistNames.join(", ")}
            </p>
          </div>
        </div>

        <div className="col-span-3 flex items-center">
          <div className="min-w-0 flex-1">
            <p className="text-base-content/70 text-sm truncate">
              {track.album.name}
            </p>
          </div>
        </div>

        <div className="col-span-2 flex items-center justify-end">
          <span className="text-base-content/50 text-sm tabular-nums">
            {formatDuration(track.durationMs)}
          </span>
        </div>
      </div>
      {trackAnalysisResult && seeSuggestions && (
        <div className="border-b border-zinc-800/30 bg-base-100/20">
          <div className="px-4 py-4">
            <TrackAnalysisResult trackAnalysisResult={trackAnalysisResult} />
          </div>
        </div>
      )}
    </>
  );
}
