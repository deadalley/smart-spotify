import { PlaylistType } from "@smart-spotify/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { baseAPI } from "../services/api";
import { PLAYLIST_TYPES } from "../utils";

interface PlaylistTypeSelectorProps {
  playlistId: string;
  currentType?: PlaylistType;
}

export function PlaylistTypeSelector({
  playlistId,
  currentType,
}: PlaylistTypeSelectorProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (playlistType: PlaylistType) =>
      baseAPI.updatePlaylistType(playlistId, playlistType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as PlaylistType;
    if (type) {
      mutation.mutate(type);
    }
  };

  return (
    <select
      value={currentType || ""}
      onChange={handleTypeChange}
      disabled={mutation.isPending}
      className="select select-sm"
    >
      <option value="" disabled>
        {mutation.isPending ? "Updating..." : "Type"}
      </option>
      {PLAYLIST_TYPES.map((type) => (
        <option key={type.value} value={type.value}>
          {type.label}
        </option>
      ))}
    </select>
  );
}
