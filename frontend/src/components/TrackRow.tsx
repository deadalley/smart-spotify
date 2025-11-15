import { Track, TrackAggregationResult } from "@smart-spotify/shared";
import { Eye, EyeClosed } from "lucide-react";
import { useState } from "react";
import { formatDuration } from "../utils";
import { PlaylistTile } from "./PlaylistTile";

interface TrackRowProps {
  track: Track;
  index: number;
  suggestedPlaylists?: TrackAggregationResult["suggestedPlaylists"];
}

export function TrackRow({ track, index, suggestedPlaylists }: TrackRowProps) {
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
              {suggestedPlaylists && (
                <button
                  className="btn btn-primary btn-soft btn-xs"
                  onClick={() => setSeeSuggestions(!seeSuggestions)}
                >
                  {seeSuggestions ? <EyeClosed size={14} /> : <Eye size={14} />}
                  Analysis
                </button>
              )}
            </div>
            <p className="text-base-content/60 text-sm truncate">
              {track.artistNames.join(", ")}
            </p>
            {suggestedPlaylists && seeSuggestions && (
              <div className="flex gap-x-3">
                <div className="flex-1 flex flex-col gap-y-2">
                  <h4 className="text-base-content font-semibold">
                    Current Playlists:
                  </h4>
                  <div className="flex flex-col gap-y-2">
                    {suggestedPlaylists.map(({ playlist }) => (
                      <PlaylistTile key={playlist.id} playlist={playlist} />
                    ))}
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-y-2">
                  <h4 className="text-base-content font-semibold">
                    Suggested Playlists:
                  </h4>
                  <div className="flex flex-col gap-y-2">
                    {suggestedPlaylists.map(({ playlist }) => (
                      <PlaylistTile key={playlist.id} playlist={playlist} />
                    ))}
                  </div>
                </div>
              </div>
            )}
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
