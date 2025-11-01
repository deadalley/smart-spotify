import { useQuery } from "@tanstack/react-query";
import { User, Users } from "lucide-react";
import { ArtistTile } from "../components/ArtistTile";
import { Empty } from "../components/Empty";
import { Error } from "../components/Error";
import { Grid } from "../components/Grid";
import { PageLoading } from "../components/Loading";
import { Page } from "../components/Page";
import { baseAPI } from "../services/api";

export function Artists() {
  const {
    data: artists,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["artists"],
    queryFn: async () => {
      const response = await baseAPI.getArtists();
      return response.data;
    },
  });

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return <Error>Failed to load artists. Please try again.</Error>;
  }

  if (!artists || artists.length === 0) {
    return <Empty Icon={User}>No Artists Found</Empty>;
  }

  return (
    <Page>
      <Page.Header
        title="Artists"
        subtitle={
          <span className="flex gap-2 items-center">
            <Users size={16} />
            {artists.length} artist{artists.length !== 1 ? "s" : ""}{" "}
          </span>
        }
      />

      <Grid>
        {artists.map((artist) => (
          <ArtistTile key={artist.id} artist={artist} />
        ))}
      </Grid>
    </Page>
  );
}
