import { Playlist } from "@smart-spotify/shared";
import { Music } from "lucide-react";

export function PlaylistRow({ playlist }: { playlist: Playlist }) {
  return (
    <>
      <div className="grid grid-cols-12 gap-4 p-4 hover:bg-zinc-900 transition-colors duration-200 group">
        <div className="col-span-12 flex items-center space-x-3">
          <div className="min-w-0 flex-1">
            <div className="flex gap-x-2 items-center">
              <p className="font-medium truncate text-base-content group-hover:text-primary">
                {playlist.name}
              </p>
            </div>
            <p className="text-base-content/60 text-sm truncate flex items-center gap-1">
              <Music size={12} />
              <span>{playlist.trackCount} tracks</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
