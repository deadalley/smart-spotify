import { Artist } from "@smart-spotify/shared";
import { Music, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ArtistRow({ artist }: { artist: Artist }) {
  const navigate = useNavigate();
  const artistImage =
    artist.images && artist.images.length > 0 ? artist.images[0].url : null;

  const handleRowClick = () => {
    navigate(`/artists/${artist.id}`);
  };

  return (
    <div
      className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-base-300/30 transition-colors duration-150 group border-b border-zinc-800/30 last:border-b-0 cursor-pointer"
      onClick={handleRowClick}
    >
      <div className="col-span-10 flex items-center">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
            {artistImage ? (
              <img
                src={artistImage}
                alt={artist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-primary/40 to-primary/60 flex items-center justify-center">
                <User className="w-5 h-5 text-base-content" />
              </div>
            )}
          </div>
          <p className="font-medium truncate text-base-content group-hover:text-primary transition-colors">
            {artist.name}
          </p>
        </div>
      </div>

      <div className="col-span-2 flex items-center justify-end">
        <span className="text-base-content/50 text-sm flex items-center gap-1.5">
          <Music size={12} />
          {artist.trackCount ?? 0}
        </span>
      </div>
    </div>
  );
}
