import { Playlist } from "@smart-spotify/shared";
import { Music } from "lucide-react";
import { Tile } from "./Tile";

export function PlaylistTile({ playlist }: { playlist: Playlist }) {
  return (
    <Tile to={`/playlists/${playlist.id}`}>
      <div className="aspect-square relative overflow-hidden">
        {playlist.images && playlist.images.length > 0 ? (
          <img
            src={playlist.images[0].url}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-base-300/50 flex items-center justify-center">
            <Music size={48} className="text-base-content/30" />
          </div>
        )}
      </div>

      <div className="card-body">
        <h3 className="card-title">{playlist.name}</h3>

        <div className="flex items-center gap-1.5 text-xs text-base-content/50">
          <Music size={12} />
          <span>
            {playlist.trackCount} track{playlist.trackCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </Tile>
  );
}
