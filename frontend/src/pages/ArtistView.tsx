import { useQuery } from "@tanstack/react-query";
import { Music, User } from "lucide-react";
import { useParams } from "react-router-dom";
import { Empty } from "../components/Empty";
import { Error } from "../components/Error";
import { PageLoading } from "../components/Loading";
import { Page } from "../components/Page";
import { SpotifyLink } from "../components/SpotifyLink";
import { TrackList } from "../components/TrackList";
import { baseAPI } from "../services/api";

export function ArtistView() {
  const { id } = useParams<{ id: string }>();

  const {
    data: artist,
    isLoading: isArtistLoading,
    error: artistError,
  } = useQuery({
    queryKey: ["artist", id],
    queryFn: async () => {
      const response = await baseAPI.getArtist(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const {
    data: tracks,
    isLoading: isTracksLoading,
    error: tracksError,
  } = useQuery({
    queryKey: ["artist-tracks", id],
    queryFn: async () => {
      const response = await baseAPI.getArtistTracks(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const isLoading = isArtistLoading || isTracksLoading;
  const error = artistError || tracksError;

  if (isLoading) {
    return <PageLoading />;
  }

  if (error || !artist || !tracks) {
    return <Error>Failed to load artist tracks. Please try again.</Error>;
  }

  const artistImage = artist.images.length > 0 ? artist.images[0].url : null;

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
                      {artist?.trackCount ?? "--"} track
                      {artist?.trackCount !== 1 ? "s" : ""}
                    </p>
                  </span>
                </div>
              </div>
            </div>
          </>
        }
        action={
          artist?.externalUrls?.spotify && (
            <SpotifyLink href={artist.externalUrls.spotify} />
          )
        }
      />

      {tracks.length === 0 ? (
        <Empty Icon={Music}>No tracks found</Empty>
      ) : (
        <TrackList tracks={tracks} />
      )}
    </Page>
  );
}
