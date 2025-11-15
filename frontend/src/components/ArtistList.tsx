import { Artist } from "@smart-spotify/shared";
import { ArtistRow } from "./ArtistRow";

export function ArtistList({ artists }: { artists: Artist[] }) {
  return (
    <div className="bg-base-200 rounded-lg overflow-hidden border border-zinc-800/50">
      <div className="p-0">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-zinc-800/50 text-base-content/50 text-xs font-medium uppercase tracking-wider bg-base-100/50">
          <div className="col-span-10">Name</div>
          <div className="col-span-2 flex items-center justify-end">Tracks</div>
        </div>

        <div className="overflow-y-auto">
          {artists.map((artist) => (
            <ArtistRow key={artist.id} artist={artist} />
          ))}
        </div>
      </div>
    </div>
  );
}
