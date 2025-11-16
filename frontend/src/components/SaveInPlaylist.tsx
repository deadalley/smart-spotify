import { Plus } from "lucide-react";

export function SaveInPlaylist() {
  return (
    <div className="flex gap-2 items-center justify-end">
      <button
        className="btn btn-sm btn-primary gap-1"
        onClick={(e) => {
          e.stopPropagation();
          // Handle add to playlist
        }}
      >
        <Plus size={14} />
        Add to playlist
      </button>
    </div>
  );
}
