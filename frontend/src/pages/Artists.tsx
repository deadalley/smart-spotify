import { Music, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/Loading";
import { Tile } from "../components/Tile";
import { spotifyAPI } from "../services/api";
import { SpotifyLibraryArtist } from "../types/spotify";

export function Artists() {
  const [artists, setArtists] = useState<SpotifyLibraryArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        setLoading(true);
        const response = await spotifyAPI.getArtists();
        setArtists(response.data.items);
        setError(null);
      } catch (err) {
        console.error("Error fetching artists:", err);
        setError("Failed to load artists from your library");
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <Music className="w-12 h-12 mx-auto mb-4" />
            <p className="text-lg font-semibold">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (artists.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold mb-2">No Artists Found</h2>
          <p className="text-gray-600">
            Add some tracks to your library to see artists here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Your Artists</h1>
        <p className="text-base-content/70">
          Artists from your saved tracks ({artists.length} total)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {artists.map((artist) => {
          const artistImage =
            artist.images && artist.images.length > 0
              ? artist.images[0].url
              : null;

          return (
            <Tile
              key={artist.id}
              onClick={() => navigate(`/artists/${artist.id}`)}
              className="cursor-pointer hover:bg-zinc-900 transition-colors"
            >
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
                <p className="text-sm text-base-content/70 mb-1">
                  {artist.track_count} track
                  {artist.track_count !== 1 ? "s" : ""}
                </p>
                {artist.followers && artist.followers.total > 0 && (
                  <p className="text-xs text-base-content/50">
                    {artist.followers.total.toLocaleString()} followers
                  </p>
                )}
              </div>
            </Tile>
          );
        })}
      </div>
    </div>
  );
}
