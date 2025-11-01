import { Music, User } from "lucide-react";
import { SpotifyLibraryArtist } from "../types/spotify";
import { Tile } from "./Tile";

export function ArtistTile({ artist }: { artist: SpotifyLibraryArtist }) {
  const artistImage =
    artist.images && artist.images.length > 0 ? artist.images[0].url : null;

  return (
    <Tile key={artist.id} to={`/artists/${artist.id}`}>
      <div className="p-4 text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-3 overflow-hidden">
          {artistImage ? (
            <img
              src={artistImage}
              alt={artist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center text-white">
              <User className="w-8 h-8" />
            </div>
          )}
        </div>
        <h3
          className="font-semibold text-base mb-1 truncate"
          title={artist.name}
        >
          {artist.name}
        </h3>
        <span className="flex gap-2 items-center justify-center">
          <Music size={12} />
          <p className="text-sm text-base-content/70">
            {artist.track_count ?? "--"} track
            {artist.track_count !== 1 ? "s" : ""}
          </p>
        </span>
      </div>
    </Tile>
  );
}
