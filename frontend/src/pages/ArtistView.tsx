import { Music, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Empty } from "../components/Empty";
import { Error } from "../components/Error";
import { PageLoading } from "../components/Loading";
import { Page } from "../components/Page";
import { SpotifyLink } from "../components/SpotifyLink";
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
    return <PageLoading />;
  }

  if (error || !data) {
    return <Error>{error || "Artist not found"}</Error>;
  }

  const { artist, tracks } = data;
  const artistImage =
    artist?.images && artist.images.length > 0 ? artist.images[0].url : null;

  return (
    <Page>
      <Page.Back to="/artists" label="Artists" />

      <Page.Header
        title={
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-16 rounded-full overflow-hidden shrink-0">
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
                <div className="flex flex-col gap-2">
                  {artist?.name || "Unknown Artist"}
                  <span className="flex gap-2 items-center justify-start">
                    <Music size={12} />
                    <p className="text-sm text-base-content/70">
                      {artist?.track_count ?? "--"} track
                      {artist?.track_count !== 1 ? "s" : ""}
                    </p>
                  </span>
                </div>
              </div>

              {artist?.external_urls?.spotify && (
                <SpotifyLink href={artist.external_urls.spotify} />
              )}
            </div>
          </>
        }
      />

      {tracks.items.length === 0 ? (
        <Empty Icon={Music}>No tracks found</Empty>
      ) : (
        <TrackList tracks={tracks.items.map((item) => item.track)} />
      )}
    </Page>
  );
}
