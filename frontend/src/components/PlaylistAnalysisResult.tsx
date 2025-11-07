import { Artist } from "@smart-spotify/shared";
import { Accordion } from "./Accordion";
import { ArtistCollection } from "./ArtistCollection";

export function PlaylistAnalysisResult({ artists }: { artists: Artist[] }) {
  return (
    <Accordion
      items={[
        {
          title: "Artists",
          content: <ArtistCollection artists={artists} />,
          defaultOpen: true,
        },
      ]}
    />
  );
}
