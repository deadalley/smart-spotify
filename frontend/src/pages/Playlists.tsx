import { useQuery } from "@tanstack/react-query";
import { Music } from "lucide-react";
import { Empty } from "../components/Empty";
import { Error } from "../components/Error";
import { PageLoading } from "../components/Loading";
import { Page } from "../components/Page";
import { PlaylistCollection } from "../components/PlaylistCollection";
import { baseAPI } from "../services/api";

export function Playlists() {
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

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return <Error>Failed to load playlists. Please try again.</Error>;
  }

  if (!playlists || playlists.length === 0) {
    return <Empty Icon={Music}>No Playlists Found</Empty>;
  }

  return (
    <Page>
      <Page.Header
        title="Playlists"
        subtitle={
          <span className="flex gap-2 items-center">
            <Music size={16} />
            {playlists.length} playlist
            {playlists.length !== 1 ? "s" : ""}
          </span>
        }
      />

      <PlaylistCollection playlists={playlists} />
    </Page>
  );
}
