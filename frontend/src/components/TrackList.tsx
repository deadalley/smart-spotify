import { Clock } from "lucide-react";
import { SpotifyPlaylistTrack, SpotifyTrack } from "../types/spotify";
import { TrackRow } from "./TrackRow";

interface TrackListProps {
  tracks: SpotifyTrack[] | SpotifyPlaylistTrack[];
}

export function TrackList({ tracks }: TrackListProps) {
  return (
    <div className="bg-base-200 shadow-xl">
      <div className="p-0">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-900 text-base-content/60 text-sm font-medium bg-zinc-900">
          <div className="col-span-1">#</div>
          <div className="col-span-6">TITLE</div>
          <div className="col-span-3">ALBUM</div>
          <div className="col-span-2 flex items-center justify-end">
            <Clock size={16} />
          </div>
        </div>

        {/* Track List */}
        <div className="overflow-y-auto">
          {tracks.map((item, index) => {
            // Handle both SpotifyTrack and SpotifyPlaylistTrack
            const track = "track" in item ? item.track : item;

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
