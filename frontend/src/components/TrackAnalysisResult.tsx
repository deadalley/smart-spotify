import { TrackAggregationResult } from "@smart-spotify/shared";
import { List } from "lucide-react";
import { Empty } from "./Empty";
import { PlaylistList } from "./PlaylistList";

export function TrackAnalysisResult({
  trackAnalysisResult,
}: {
  trackAnalysisResult: TrackAggregationResult;
}) {
  return (
    <div className="w-full flex gap-6 py-3">
      {trackAnalysisResult.currentPlaylists.length > 0 && (
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <h4 className="text-base-content/50 text-xs font-medium uppercase tracking-wider">
            Current Playlists
          </h4>
          <div className="flex-1 min-h-0">
            <PlaylistList playlists={trackAnalysisResult.currentPlaylists} />
          </div>
        </div>
      )}
      <div className="flex-2 flex flex-col gap-2 min-h-0">
        <h4 className="text-primary text-xs font-medium uppercase tracking-wider">
          Suggested Playlists
        </h4>
        {trackAnalysisResult.suggestedPlaylists.length > 0 ? (
          <div className="flex-1 min-h-0">
            <PlaylistList
              playlists={[]}
              trackAnalysisResult={trackAnalysisResult}
            />
          </div>
        ) : (
          <Empty size="sm" Icon={List}>
            No playlist suggestions found
          </Empty>
        )}
      </div>
    </div>
  );
}
