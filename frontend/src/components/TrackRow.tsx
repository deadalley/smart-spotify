import { Track } from "@smart-spotify/shared";
import { formatDuration } from "../utils";

interface TrackRowProps {
  track: Track;
  index: number;
}

export function TrackRow({ track, index }: TrackRowProps) {
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
            <p className="font-medium truncate text-base-content group-hover:text-primary">
              {track.name}
            </p>
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
    </>
  );
}
