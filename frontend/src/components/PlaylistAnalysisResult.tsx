import { Artist, PlaylistConsistencyAnalysis } from "@smart-spotify/shared";
import { Accordion } from "./Accordion";
import { ArtistCollection } from "./ArtistCollection";
import { GenreCluster } from "./GenreCluster";
import { PlaylistConsistency } from "./PlaylistConsistency";

export function PlaylistAnalysisResult({
  artists,
  genres,
  consistencyAnalysis,
}: {
  artists: Artist[];
  genres: { name: string; count: number }[];
  consistencyAnalysis?: PlaylistConsistencyAnalysis;
}) {
  const items = [
    {
      title: "Artists",
      content: <ArtistCollection artists={artists} />,
      defaultOpen: false,
    },
    {
      title: "Genres",
      content: <GenreCluster genres={genres} />,
      defaultOpen: true,
    },
  ];

  if (consistencyAnalysis) {
    items.push({
      title: "Consistency Analysis",
      content: (
        <PlaylistConsistency consistencyAnalysis={consistencyAnalysis} />
      ),
      defaultOpen: true,
    });
  }

  return <Accordion items={items} />;
}
