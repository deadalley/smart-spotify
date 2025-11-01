import { useQuery } from "@tanstack/react-query";
import { Music } from "lucide-react";
import { Empty } from "../components/Empty";
import { Error } from "../components/Error";
import { Grid } from "../components/Grid";
import { PageLoading } from "../components/Loading";
import { Page } from "../components/Page";
import { PlaylistTile } from "../components/PlaylistTile";
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
    return <PageLoading />;
  }

  if (error) {
    return <Error>Failed to load playlists. Please try again.</Error>;
  }

  const playlists: SpotifyPlaylist[] = playlistsData?.items || [];

  if (playlists.length === 0) {
    return <Empty Icon={Music}>No Playlists Found</Empty>;
  }

  return (
    <Page>
      <Page.Header
        title="Playlists"
        subtitle={
          <span className="flex gap-2 items-center">
            <Music size={16} />
            {playlists.length} playlist{playlists.length !== 1 ? "s" : ""}{" "}
          </span>
        }
      />

      <Grid>
        {playlists.map((playlist) => (
          <PlaylistTile key={playlist.id} playlist={playlist} />
        ))}
      </Grid>

      {playlists.length === 0 && (
        <div className="text-center py-12">
          <Music size={64} className="text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg mb-2">No playlists found</p>
          <p className="text-zinc-500">
            Create some playlists on Spotify to see them here.
          </p>
        </div>
      )}
    </Page>
  );
}
