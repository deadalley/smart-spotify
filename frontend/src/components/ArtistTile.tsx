import { Artist } from "@smart-spotify/shared";
import { Music, User } from "lucide-react";
import { Tile } from "./Tile";

export function ArtistTile({ artist }: { artist: Artist }) {
  const artistImage =
    artist.images && artist.images.length > 0 ? artist.images[0].url : null;

  return (
    <Tile key={artist.id} to={`/artists/${artist.id}`}>
      <div className="card-body flex flex-col items-center text-center gap-3">
        <div className="w-20 h-20 rounded-full overflow-hidden">
          {artistImage ? (
            <img
              src={artistImage}
              alt={artist.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center">
              <User className="w-10 h-10 text-base-content" />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center w-full">
          <h3
            className="card-title group-hover:text-primary transition-colors"
            title={artist.name}
          >
            {artist.name}
          </h3>

          <div className="flex gap-2 items-center justify-center text-xs text-base-content/50">
            <Music size={12} />
            <span>
              {artist.trackCount ?? 0} track
              {artist.trackCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
    </Tile>
  );
}
