import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus } from "lucide-react";
import { spotifyAPI } from "../services/api";
import { Tooltip } from "./Tooltip";

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
      <Tooltip content="Added to playlist">
        <button
          className="btn btn-sm max-lg:btn-circle lg:btn-wide btn-success"
          disabled
        >
          <Check size={14} />
          <span className="max-lg:hidden lg:inline whitespace-pre">Added</span>
        </button>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      content={
        addToPlaylistMutation.isPending
          ? "Adding to playlist..."
          : "Add to playlist"
      }
    >
      <button
        className="btn btn-sm max-lg:btn-circle lg:btn-wide btn-primary"
        onClick={handleAddToPlaylist}
        disabled={addToPlaylistMutation.isPending}
      >
        {addToPlaylistMutation.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Plus size={14} />
        )}
        <span className="max-lg:hidden lg:inline whitespace-pre">
          {addToPlaylistMutation.isPending ? "Adding..." : "Add to playlist"}
        </span>
      </button>
    </Tooltip>
  );
}
