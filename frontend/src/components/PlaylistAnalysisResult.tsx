import { Artist } from "@smart-spotify/shared";
import { Accordion } from "./Accordion";
import { ArtistCollection } from "./ArtistCollection";

export function PlaylistAnalysisResult({
  artists,
  genres,
}: {
  artists: Artist[];
  genres: { name: string; count: number }[];
}) {
  const sortedGenres = [...genres].sort((a, b) => b.count - a.count);
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
          content: (
            <div className="flex gap-y-4 gap-x-2 flex-wrap">
              {sortedGenres.map(({ name, count }) => (
                <div key={name} className="badge badge-lg badge-outline">
                  {name} ({count})
                </div>
              ))}
            </div>
          ),
          defaultOpen: true,
        },
      ]}
    />
  );
}
