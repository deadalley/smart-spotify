import { useQuery } from "@tanstack/react-query";
import { Music, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Loading } from "../components/Loading";
import { spotifyAPI } from "../services/api";
import { SpotifyPlaylist } from "../types/spotify";

export function Playlists() {
  const {
    data: playlistsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["playlists"],
    queryFn: async () => {
      const response = await spotifyAPI.getPlaylists();
      return response.data;
    },
  });

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-red-400">
            Failed to load playlists. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const playlists: SpotifyPlaylist[] = playlistsData?.items || [];

  return (
    <div className="container p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Playlists</h1>
        <p className="text-zinc-400">
          {playlists.length} playlist{playlists.length !== 1 ? "s" : ""}{" "}
          available
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {playlists.map((playlist) => (
          <Link
            key={playlist.id}
            to={`/playlists/${playlist.id}`}
            className="bg-zinc-800 p-4 rounded-lg hover:bg-zinc-700 transition-colors duration-200 group"
          >
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

            <p className="text-zinc-400 text-sm truncate mb-2">
              By {playlist.owner.display_name}
            </p>

            <div className="flex items-center space-x-4 text-xs text-zinc-500">
              <span className="flex items-center space-x-1">
                <Music size={12} />
                <span>{playlist.tracks.total} tracks</span>
              </span>
              {playlist.collaborative && (
                <span className="flex items-center space-x-1">
                  <Users size={12} />
                  <span>Collaborative</span>
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {playlists.length === 0 && (
        <div className="text-center py-12">
          <Music size={64} className="text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg mb-2">No playlists found</p>
          <p className="text-zinc-500">
            Create some playlists on Spotify to see them here.
          </p>
        </div>
      )}
    </div>
  );
}
