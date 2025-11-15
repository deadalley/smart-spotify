import { useQuery } from "@tanstack/react-query";
import { Clock, Music } from "lucide-react";
import { useParams } from "react-router-dom";
import { Empty } from "../components/Empty";
import { Error } from "../components/Error";
import { PageLoading } from "../components/Loading";
import { Page } from "../components/Page";
import { PlaylistAnalysisResult } from "../components/PlaylistAnalysisResult";
import { PlaylistTypeSelector } from "../components/PlaylistTypeSelector";
import { SpotifyLink } from "../components/SpotifyLink";
import { TrackList } from "../components/TrackList";
import { baseAPI } from "../services/api";
import { formatDuration } from "../utils";

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
    data: analysisResult,
    isLoading: isAnalysisLoading,
    error: analysisError,
  } = useQuery({
    queryKey: ["playlist-analysis", id],
    queryFn: async () => {
      const response = await baseAPI.analyzePlaylist(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const isLoading = isPlaylistLoading || isAnalysisLoading;
  const error = playlistError || analysisError;

  if (isLoading) {
    return <PageLoading />;
  }

  if (error || !playlist || !analysisResult) {
    return <Error>Failed to load playlist tracks. Please try again.</Error>;
  }

  const { artists, genres, tracks } = analysisResult;

  return (
    <Page>
      <Page.Back to="/playlists" label="Playlists" />
      <Page.Header
        title={playlist?.name || "Playlist"}
        action={
          <div className="flex gap-2 items-center">
            <PlaylistTypeSelector
              playlistId={id!}
              currentType={playlist.playlistType}
            />
            <SpotifyLink href={playlist.externalUrls.spotify} />
          </div>
        }
        subtitle={
          <div className="flex gap-2 items-center">
            <span className="flex gap-2 items-center justify-start text-zinc-400">
              <Music size={16} />
              {tracks.length} track{tracks.length !== 1 ? "s" : ""}
            </span>
            •
            <span className="flex gap-2 items-center justify-start text-zinc-400">
              <Clock size={16} />
              {formatDuration(analysisResult.totalDurationMs)}
            </span>
          </div>
        }
      />

      <div className="flex gap-x-4">
        <div className="flex-1">
          {tracks.length === 0 ? (
            <Empty Icon={Music}>No tracks found</Empty>
          ) : (
            <TrackList tracks={tracks} />
          )}
        </div>

        {analysisResult && (
          <div className="flex-1">
            <PlaylistAnalysisResult artists={artists} genres={genres} />
          </div>
        )}
      </div>
    </Page>
  );
}
