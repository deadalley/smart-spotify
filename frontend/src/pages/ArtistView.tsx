import { ArrowLeft, ExternalLink, Music, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loading } from "../components/Loading";
import { TrackList } from "../components/TrackList";
import { spotifyAPI } from "../services/api";
import { SpotifyLibraryArtist, SpotifyPlaylistTrack } from "../types/spotify";

interface ArtistTracksResponse {
  artist: SpotifyLibraryArtist | null;
  tracks: {
    items: SpotifyPlaylistTrack[];
    total: number;
  };
}

export function ArtistView() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ArtistTracksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtistTracks = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await spotifyAPI.getArtistTracks(id);
        setData(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching artist tracks:", err);
        setError("Failed to load artist tracks");
      } finally {
        setLoading(false);
      }
    };

    fetchArtistTracks();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <Music className="w-12 h-12 mx-auto mb-4" />
            <p className="text-lg font-semibold">
              {error || "Artist not found"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { artist, tracks } = data;
  const artistImage =
    artist?.images && artist.images.length > 0 ? artist.images[0].url : null;

  return (
    <div className="container p-6">
      {/* Back button */}
      <div className="mb-6">
        <Link to="/artists" className="btn btn-ghost btn-sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Artists
        </Link>
      </div>

      {/* Artist header */}
      <div className="flex items-center gap-6 mb-8">
        <div className="w-32 h-32 rounded-full overflow-hidden shrink-0">
          {artistImage ? (
            <img
              src={artistImage}
              alt={artist?.name || "Artist"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center text-white">
              <User className="w-16 h-16" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-2">
            {artist?.name || "Unknown Artist"}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-base-content/70 mb-4">
            <span>
              {tracks.total} track{tracks.total !== 1 ? "s" : ""} in your
              library
            </span>
            {artist?.followers && artist.followers.total > 0 && (
              <span>{artist.followers.total.toLocaleString()} followers</span>
            )}
            {artist?.popularity && (
              <span>Popularity: {artist.popularity}%</span>
            )}
          </div>

          {artist?.genres && artist.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {artist.genres.slice(0, 5).map((genre) => (
                <span key={genre} className="badge badge-outline">
                  {genre}
                </span>
              ))}
            </div>
          )}

          {artist?.external_urls?.spotify && (
            <a
              href={artist.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Spotify
            </a>
          )}
        </div>
      </div>

      {/* Tracks list */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Tracks in Your Library</h2>

        {tracks.items.length > 0 ? (
          <TrackList tracks={tracks.items} />
        ) : (
          <div className="text-center py-8">
            <Music className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No tracks found for this artist</p>
          </div>
        )}
      </div>
    </div>
  );
}
