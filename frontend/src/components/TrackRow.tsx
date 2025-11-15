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
      <div className="grid grid-cols-12 gap-4 p-4 hover:bg-zinc-900 transition-colors duration-200 group">
        <div className="col-span-1 flex items-center">
          <span className="text-base-content/60 group-hover:text-base-content">
            {index + 1}
          </span>
        </div>

        <div className="col-span-6 flex items-center space-x-3">
          <div className="min-w-0 flex-1">
            <div className="flex gap-x-2 items-center">
              <p className="font-medium truncate text-base-content group-hover:text-primary">
                {track.name}
              </p>
              {trackAnalysisResult && (
                <button
                  className="btn btn-primary btn-soft btn-xs"
                  onClick={() => setSeeSuggestions(!seeSuggestions)}
                >
                  {seeSuggestions ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                  <span className="text-xs">Analysis</span>
                </button>
              )}
            </div>
            <p className="text-base-content/60 text-sm truncate">
              {track.artistNames.join(", ")}
            </p>
          </div>
        </div>

        <div className="col-span-3 flex items-center space-x-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate text-base-content">
              {track.album.name}
            </p>
          </div>
        </div>

        <div className="col-span-2 flex items-center justify-end">
          <span className="text-base-content/60 text-sm tabular-nums">
            {formatDuration(track.durationMs)}
          </span>
        </div>
      </div>
      {trackAnalysisResult && seeSuggestions && (
        <div className="border-t border-zinc-800/30 bg-zinc-900/30">
          <div className="px-6 py-3">
            <TrackAnalysisResult trackAnalysisResult={trackAnalysisResult} />
          </div>
        </div>
      )}
    </>
  );
}
