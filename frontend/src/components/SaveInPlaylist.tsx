import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus } from "lucide-react";
import { spotifyAPI } from "../services/api";

export function SaveInPlaylist({
  trackId,
  playlistId,
}: {
  trackId: string;
  playlistId: string;
}) {
  const queryClient = useQueryClient();

  const addToPlaylistMutation = useMutation({
    mutationFn: async () => {
      return spotifyAPI.addTrackToPlaylist(playlistId, trackId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["aggregated-liked-songs"] });
      queryClient.invalidateQueries({ queryKey: ["saved-tracks"] });
    },
  });

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToPlaylistMutation.mutate();
  };

  if (addToPlaylistMutation.isSuccess) {
    return (
      <div className="flex gap-2 items-center justify-end">
        <button className="btn btn-sm btn-success gap-1" disabled>
          <Check size={14} />
          Added
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center justify-end">
      <button
        className="btn btn-sm btn-primary gap-1"
        onClick={handleAddToPlaylist}
        disabled={addToPlaylistMutation.isPending}
      >
        {addToPlaylistMutation.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Plus size={14} />
        )}
        {addToPlaylistMutation.isPending ? "Adding..." : "Add to playlist"}
      </button>
      {addToPlaylistMutation.isError && (
        <span className="text-error text-xs">Failed</span>
      )}
    </div>
  );
}
