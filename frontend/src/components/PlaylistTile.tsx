import { Music } from "lucide-react";
import { Playlist } from "../types";
import { Tile } from "./Tile";

export function PlaylistTile({ playlist }: { playlist: Playlist }) {
  return (
    <Tile to={`/playlists/${playlist.id}`}>
      <div className="aspect-square mb-4 relative overflow-hidden rounded-lg">
        {playlist.images && playlist.images.length > 0 ? (
          <img
            src={playlist.images[0].url}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
            <Music size={48} className="text-zinc-500" />
          </div>
        )}
      </div>

      <h3 className="text-white font-semibold truncate mb-1">
        {playlist.name}
      </h3>

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Music size={12} />
        <span>{playlist.trackCount} tracks</span>
      </div>
    </Tile>
  );
}
