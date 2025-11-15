import { Playlist, Track, TrackAggregationResult } from "@smart-spotify/shared";
import { Music, Plus } from "lucide-react";

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
          suggestedPlaylist ? "col-span-5" : "col-span-12"
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
          <div className="col-span-3 flex flex-wrap gap-2 items-center">
            {suggestedPlaylist.similarArtists.length > 0 ? (
              suggestedPlaylist.similarArtists.map((artist) => (
                <span
                  key={artist.artist.id}
                  className="badge badge-sm badge-primary h-fit"
                >
                  {artist.artist.name}
                  <span className="flex items-center gap-x-1">
                    <Music size={10} />
                    {artist.trackCount}
                  </span>
                </span>
              ))
            ) : (
              <span className="text-base-content/60 text-xs">None</span>
            )}
          </div>
          <div className="col-span-2 flex flex-wrap gap-2 items-center">
            {suggestedPlaylist.similarGenres.length > 0 ? (
              suggestedPlaylist.similarGenres.map((genre) => (
                <span
                  key={genre.name}
                  className="badge badge-sm badge-primary h-fit"
                >
                  {genre.name}
                  <span className="flex items-center gap-x-1">
                    <Music size={10} />
                    {genre.count}
                  </span>
                </span>
              ))
            ) : (
              <span className="text-base-content/60 text-xs">None</span>
            )}
          </div>
          <div className="col-span-2 flex gap-2 items-center justify-end">
            <button className="btn btn-sm btn-primary btn-outline">
              <Plus size={14} />
              Add to playlist
            </button>
          </div>
        </>
      )}
    </div>
  );
}
