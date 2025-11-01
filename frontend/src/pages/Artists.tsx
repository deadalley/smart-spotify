import { User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { ArtistTile } from "../components/ArtistTile";
import { Empty } from "../components/Empty";
import { Error } from "../components/Error";
import { Grid } from "../components/Grid";
import { PageLoading } from "../components/Loading";
import { Page } from "../components/Page";
import { spotifyAPI } from "../services/api";
import { SpotifyLibraryArtist } from "../types/spotify";

export function Artists() {
  const [artists, setArtists] = useState<SpotifyLibraryArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        setLoading(true);
        const response = await spotifyAPI.getArtists();
        setArtists(response.data.items);
        setError(null);
      } catch (err) {
        console.error("Error fetching artists:", err);
        setError("Failed to load artists from your library");
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, []);

  if (loading) {
    return <PageLoading />;
  }

  if (error) {
    return <Error>{error}</Error>;
  }

  if (artists.length === 0) {
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
