import { Artist } from "@smart-spotify/shared";
import { Accordion } from "./Accordion";
import { ArtistCollection } from "./ArtistCollection";
import { GenreCluster } from "./GenreCluster";

export function PlaylistAnalysisResult({
  artists,
  genres,
}: {
  artists: Artist[];
  genres: { name: string; count: number }[];
}) {
  return (
    <Accordion
      items={[
        {
          title: "Artists",
          content: <ArtistCollection artists={artists} />,
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
