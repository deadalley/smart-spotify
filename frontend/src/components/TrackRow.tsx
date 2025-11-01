import { Music } from "lucide-react";
import { SpotifyTrack } from "../types/spotify";
import { formatDuration } from "../utils";

interface TrackRowProps {
  track: SpotifyTrack;
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
          <div className="avatar">
            <div className="w-12 h-12 rounded">
              {track.album.images[0] ? (
                <img src={track.album.images[0].url} alt={track.album.name} />
              ) : (
                <div className="bg-zinc-900 flex items-center justify-center">
                  <Music size={16} />
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate text-base-content group-hover:text-primary">
              {track.name}
            </p>
            <p className="text-base-content/60 text-sm truncate">
              {track.artists.map((artist) => artist.name).join(", ")}
            </p>
          </div>
        </div>

        <div className="col-span-3 flex items-center">
          <p className="text-base-content/60 text-sm truncate hover:text-base-content">
            {track.album.name}
          </p>
        </div>

        <div className="col-span-2 flex items-center justify-end">
          <span className="text-base-content/60 text-sm tabular-nums">
            {formatDuration(track.duration_ms)}
          </span>
        </div>
      </div>
    </>
  );
}
