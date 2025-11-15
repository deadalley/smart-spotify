import { Playlist } from "@smart-spotify/shared";
import { PlaylistRow } from "./PlaylistRow";

export function PlaylistList({ playslists }: { playslists: Playlist[] }) {
  return (
    <div className="bg-base-200 shadow-xl">
      <div className="p-0">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-900 text-base-content/60 text-sm font-medium bg-zinc-900">
          <div className="col-span-12">NAME</div>
        </div>

        <div className="overflow-y-auto">
          {playslists.map((playlist, index) => (
            <PlaylistRow key={`${playlist.id}-${index}`} playlist={playlist} />
          ))}
        </div>
      </div>
    </div>
  );
}
