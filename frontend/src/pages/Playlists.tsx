import { useQuery } from "@tanstack/react-query";
import { Music } from "lucide-react";
import { useMemo, useState } from "react";
import { Empty } from "../components/Empty";
import { Error } from "../components/Error";
import { Grid } from "../components/Grid";
import { PageLoading } from "../components/Loading";
import { Page } from "../components/Page";
import { PlaylistTile } from "../components/PlaylistTile";
import { Sort, SortDirection, SortOption } from "../components/Sort";
import { baseAPI } from "../services/api";

export function Playlists() {
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const {
    data: playlists,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["playlists"],
    queryFn: async () => {
      const response = await baseAPI.getPlaylists();
      return response.data;
    },
  });

  const sortedPlaylists = useMemo(() => {
    if (!playlists) return [];

    return [...playlists].sort((a, b) => {
      let comparison = 0;

      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a.trackCount - b.trackCount;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [playlists, sortBy, sortDirection]);

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return <Error>Failed to load playlists. Please try again.</Error>;
  }

  if (!sortedPlaylists || sortedPlaylists.length === 0) {
    return <Empty Icon={Music}>No Playlists Found</Empty>;
  }

  return (
    <Page>
      <Page.Header
        title="Playlists"
        subtitle={
          <span className="flex gap-2 items-center">
            <Music size={16} />
            {sortedPlaylists.length} playlist
            {sortedPlaylists.length !== 1 ? "s" : ""}{" "}
          </span>
        }
      />

      <Sort
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
      />

      <Grid>
        {sortedPlaylists.map((playlist) => (
          <PlaylistTile key={playlist.id} playlist={playlist} />
        ))}
      </Grid>

      {sortedPlaylists.length === 0 && (
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
