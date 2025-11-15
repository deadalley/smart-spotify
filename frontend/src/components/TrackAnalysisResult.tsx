import { TrackAggregationResult } from "@smart-spotify/shared";
import { PlaylistViewSwitch } from "./PlaylistViewSwitch";

export function TrackAnalysisResult({
  trackAnalysisResult,
}: {
  trackAnalysisResult: TrackAggregationResult;
}) {
  return (
    <div className="flex gap-x-3 h-[550px] w-full border-t border-zinc-800 py-4 px-8 ">
      <div className="flex-1 flex flex-col gap-y-2 min-h-0">
        <h4 className="text-base-content font-semibold">Current Playlists:</h4>
        <div className="flex-1 min-h-0">
          <PlaylistViewSwitch
            view="list"
            playlists={trackAnalysisResult.currentPlaylists}
          />
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-y-2 min-h-0">
        <h4 className="text-base-content font-semibold">
          Suggested Playlists:
        </h4>
        <div className="flex-1 min-h-0">
          <PlaylistViewSwitch
            view="list"
            playlists={[]}
            trackAnalysisResult={trackAnalysisResult}
          />
        </div>
      </div>
    </div>
  );
}
