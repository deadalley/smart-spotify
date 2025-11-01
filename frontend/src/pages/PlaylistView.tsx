import { useQuery } from "@tanstack/react-query";
import { Music } from "lucide-react";
import { useParams } from "react-router-dom";
import { Empty } from "../components/Empty";
import { Error } from "../components/Error";
import { PageLoading } from "../components/Loading";
import { Page } from "../components/Page";
import { SpotifyLink } from "../components/SpotifyLink";
import { TrackList } from "../components/TrackList";
import { baseAPI } from "../services/api";

export function PlaylistView() {
  const { id } = useParams<{ id: string }>();

  const {
    data: playlist,
    isLoading: isPlaylistLoading,
    error: playlistError,
  } = useQuery({
    queryKey: ["playlist", id],
    queryFn: async () => {
      const response = await baseAPI.getPlaylist(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const {
    data: tracks,
    isLoading: isTracksLoading,
    error: tracksError,
  } = useQuery({
    queryKey: ["playlist-tracks", id],
    queryFn: async () => {
      const response = await baseAPI.getPlaylistTracks(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const isLoading = isPlaylistLoading || isTracksLoading;
  const error = playlistError || tracksError;

  if (isLoading) {
    return <PageLoading />;
  }

  if (error || !playlist || !tracks) {
    return <Error>Failed to load playlist tracks. Please try again.</Error>;
  }

  return (
    <Page>
      <Page.Back to="/playlists" label="Playlists" />
      <Page.Header
        title={
          <div className="flex justify-between items-center">
            {playlist?.name || "Playlist"}
            <SpotifyLink href={playlist.externalUrls.spotify} />
          </div>
        }
        subtitle={
          <span className="flex gap-2 items-center justify-start text-zinc-400">
            <Music size={16} />
            {tracks.length} track{tracks.length !== 1 ? "s" : ""}
          </span>
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
