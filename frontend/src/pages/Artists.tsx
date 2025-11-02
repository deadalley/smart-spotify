import { useQuery } from "@tanstack/react-query";
import { User, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { ArtistTile } from "../components/ArtistTile";
import { Empty } from "../components/Empty";
import { Error } from "../components/Error";
import { Grid } from "../components/Grid";
import { PageLoading } from "../components/Loading";
import { Page } from "../components/Page";
import { Sort, SortDirection, SortOption } from "../components/Sort";
import { baseAPI } from "../services/api";

export function Artists() {
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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

  const sortedArtists = useMemo(() => {
    if (!artists) return [];

    return [...artists].sort((a, b) => {
      let comparison = 0;

      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a.trackCount - b.trackCount;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [artists, sortBy, sortDirection]);

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return <Error>Failed to load artists. Please try again.</Error>;
  }

  if (!sortedArtists || sortedArtists.length === 0) {
    return <Empty Icon={User}>No Artists Found</Empty>;
  }

  return (
    <Page>
      <Page.Header
        title="Artists"
        subtitle={
          <span className="flex gap-2 items-center">
            <Users size={16} />
            {sortedArtists.length} artist{sortedArtists.length !== 1 ? "s" : ""}{" "}
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
        {sortedArtists.map((artist) => (
          <ArtistTile key={artist.id} artist={artist} />
        ))}
      </Grid>
    </Page>
  );
}
