import { Playlist, Track, TrackAggregationResult } from "@smart-spotify/shared";
import { Music } from "lucide-react";

export function PlaylistRow({
  playlist,
  suggestedPlaylist,
}: {
  playlist: Playlist;
  track?: Track;
  suggestedPlaylist?: TrackAggregationResult["suggestedPlaylists"][number];
}) {
  return (
    <div className="grid grid-cols-12 gap-4 p-4 hover:bg-zinc-900 transition-colors duration-200 group">
      <div
        className={`flex items-center space-x-3 ${
          suggestedPlaylist ? "col-span-6" : "col-span-12"
        }`}
      >
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

      {suggestedPlaylist && (
        <>
          <div className="col-span-3">
            {suggestedPlaylist.similarArtists.length > 0 ? (
              suggestedPlaylist.similarArtists.map((artist) => (
                <span
                  key={artist.artist.id}
                  className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full"
                >
                  {artist.artist.name} ({artist.trackCount})
                </span>
              ))
            ) : (
              <span className="text-base-content/60 text-xs">None</span>
            )}
          </div>
          <div className="col-span-3">
            {suggestedPlaylist.similarGenres.length > 0 ? (
              suggestedPlaylist.similarGenres.map((genre) => (
                <span
                  key={genre.name}
                  className="bg-secondary/10 text-secondary text-xs px-2 py-1 rounded-full"
                >
                  {genre.name} ({genre.count})
                </span>
              ))
            ) : (
              <span className="text-base-content/60 text-xs">None</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
