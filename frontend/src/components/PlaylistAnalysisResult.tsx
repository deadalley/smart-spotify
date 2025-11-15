import { Artist } from "@smart-spotify/shared";
import { Accordion } from "./Accordion";
import { ArtistCollection } from "./ArtistCollection";
import { GenreCluster } from "./GenreCluster";

export function PlaylistAnalysisResult({
  artists,
  genres,
}: {
  artists: { artist: Artist; trackCount: number }[];
  genres: { name: string; count: number }[];
}) {
  return (
    <Accordion
      items={[
        {
          title: "Artists",
          content: (
            <ArtistCollection artists={artists.map(({ artist }) => artist)} />
          ),
          defaultOpen: true,
        },
        {
          title: "Genres",
          content: <GenreCluster genres={genres} />,
          defaultOpen: true,
        },
      ]}
    />
  );
}
