import { Playlist, Track, TrackAggregationResult } from "@smart-spotify/shared";
import { Music, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PLAYLIST_TYPES } from "../utils";

export function PlaylistRow({
  playlist,
  suggestedPlaylist,
}: {
  playlist: Playlist;
  track?: Track;
  suggestedPlaylist?: TrackAggregationResult["suggestedPlaylists"][number];
}) {
  const navigate = useNavigate();

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on a button or badge
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    navigate(`/playlists/${playlist.id}`);
  };

  const playlistImage =
    playlist.images && playlist.images.length > 0
      ? playlist.images[0].url
      : null;

  return (
    <div
      className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-base-300/30 transition-colors duration-150 border-b border-zinc-800/30 last:border-b-0 cursor-pointer group/row"
      onClick={handleRowClick}
    >
      <div
        className={`flex items-center ${
          suggestedPlaylist ? "col-span-3" : "col-span-10"
        }`}
      >
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-base-300/50">
            {playlistImage ? (
              <img
                src={playlistImage}
                alt={playlist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music size={20} className="text-base-content/30" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate text-base-content group-hover/row:text-primary transition-colors">
              {playlist.name}
            </p>
            <p className="text-base-content/50 text-sm flex items-center gap-1.5 mt-0.5">
              <Music size={12} />
              <span>{playlist.trackCount} tracks</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center col-span-2">
        {playlist.playlistType && (
          <span className="badge badge-sm capitalize">
            {PLAYLIST_TYPES.find((type) => type.value === playlist.playlistType)
              ?.label ?? playlist.playlistType}
          </span>
        )}
      </div>

      {suggestedPlaylist && (
        <>
          <div className="col-span-3 flex flex-wrap gap-1.5 items-center">
            {suggestedPlaylist.similarArtists.length > 0 ? (
              suggestedPlaylist.similarArtists.map((artist) => (
                <span
                  key={artist.artist.id}
                  className="badge badge-sm badge-primary"
                >
                  <span>{artist.artist.name}</span>
                  <span className="flex items-center gap-1 text-primary/70">
                    <Music size={10} />
                    {artist.trackCount}
                  </span>
                </span>
              ))
            ) : (
              <span className="text-base-content/40 text-xs">None</span>
            )}
          </div>
          <div className="col-span-2 flex flex-wrap gap-1.5 items-center">
            {suggestedPlaylist.similarGenres.length > 0 ? (
              suggestedPlaylist.similarGenres.map((genre) => (
                <span key={genre.name} className="badge badge-sm badge-primary">
                  <span>{genre.name}</span>
                  <span className="flex items-center gap-1 text-primary/70">
                    <Music size={10} />
                    {genre.count}
                  </span>
                </span>
              ))
            ) : (
              <span className="text-base-content/40 text-xs">None</span>
            )}
          </div>
          <div className="col-span-2 flex gap-2 items-center justify-end">
            <button className="btn btn-sm btn-primary gap-1">
              <Plus size={14} />
              Add to playlist
            </button>
          </div>
        </>
      )}
    </div>
  );
}
