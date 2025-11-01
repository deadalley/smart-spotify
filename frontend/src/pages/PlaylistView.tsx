import { useQuery } from "@tanstack/react-query";
import { Music } from "lucide-react";
import { useParams } from "react-router-dom";
import { Loading } from "../components/Loading";
import { TrackList } from "../components/TrackList";
import { spotifyAPI } from "../services/api";
import { SpotifyPlaylist, SpotifyPlaylistTrack } from "../types/spotify";

export function PlaylistView() {
  const { id } = useParams<{ id: string }>();

  const {
    data: playlistData,
    isLoading: isPlaylistLoading,
    error: playlistError,
  } = useQuery({
    queryKey: ["playlist", id],
    queryFn: async () => {
      const response = await spotifyAPI.getPlaylist(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const {
    data: tracksData,
    isLoading: isTracksLoading,
    error: tracksError,
  } = useQuery({
    queryKey: ["playlist-tracks", id],
    queryFn: async () => {
      const response = await spotifyAPI.getPlaylistTracks(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const isLoading = isPlaylistLoading || isTracksLoading;
  const error = playlistError || tracksError;

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Failed to load playlist tracks. Please try again.</span>
        </div>
      </div>
    );
  }

  const tracks: SpotifyPlaylistTrack[] = tracksData?.items || [];
  const playlist: SpotifyPlaylist = playlistData;

  return (
    <div className="container p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {playlist?.name || "Playlist"}
        </h1>
        <p className="text-zinc-400">
          {tracks.length} track{tracks.length !== 1 ? "s" : ""}
        </p>
        {playlist?.description && (
          <p className="text-zinc-500 text-sm mt-2">{playlist.description}</p>
        )}
      </div>

      {tracks.length === 0 ? (
        <div className="hero min-h-96">
          <div className="hero-content text-center">
            <div className="max-w-md">
              <Music size={64} className="mx-auto mb-4 text-base-content/40" />
              <h1 className="text-2xl font-bold text-base-content mb-4">
                No tracks found
              </h1>
              <p className="text-base-content/60">This playlist is empty.</p>
            </div>
          </div>
        </div>
      ) : (
        <TrackList tracks={tracks.map((item) => item.track)} />
      )}
    </div>
  );
}
