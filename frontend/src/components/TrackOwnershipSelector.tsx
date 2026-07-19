import { TrackOwnership } from "@smart-spotify/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Circle, CircleCheck, Star } from "lucide-react";
import { baseAPI } from "../services/api";
import { TRACK_OWNERSHIP_OPTIONS } from "../utils";

const OWNERSHIP_ICONS: Record<TrackOwnership, typeof Circle> = {
  [TrackOwnership.NOT_OWNED]: Circle,
  [TrackOwnership.WISHLIST]: Star,
  [TrackOwnership.OWNED]: CircleCheck,
};

const OWNERSHIP_COLOR_CLASSES: Record<TrackOwnership, string> = {
  [TrackOwnership.NOT_OWNED]: "text-base-content/40",
  [TrackOwnership.WISHLIST]: "text-primary",
  [TrackOwnership.OWNED]: "text-success",
};

interface TrackOwnershipSelectorProps {
  trackId: string;
  currentOwnership: TrackOwnership;
}

export function TrackOwnershipSelector({
  trackId,
  currentOwnership,
}: TrackOwnershipSelectorProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (ownership: TrackOwnership) =>
      baseAPI.updateTrackOwnership(trackId, ownership),
    onSuccess: () => {
      // Ownership can be shown from many different query keys across
      // pages (saved tracks, playlist/artist/album tracks, the wishlist
      // list, ...), so refresh everything rather than trying to enumerate
      // every key that might currently be displaying this track.
      queryClient.invalidateQueries();
    },
  });

  const Icon = OWNERSHIP_ICONS[currentOwnership];

  return (
    <div
      className="dropdown dropdown-end"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        tabIndex={0}
        className={`btn btn-ghost btn-xs btn-circle ${OWNERSHIP_COLOR_CLASSES[currentOwnership]}`}
        title="Set ownership status"
      >
        <Icon
          size={16}
          fill={currentOwnership !== TrackOwnership.NOT_OWNED ? "currentColor" : "none"}
        />
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-10 w-40 p-1 shadow-md border border-base-200"
      >
        {TRACK_OWNERSHIP_OPTIONS.map((option) => {
          const OptionIcon = OWNERSHIP_ICONS[option.value];
          return (
            <li key={option.value}>
              <button
                type="button"
                className={
                  option.value === currentOwnership
                    ? "active"
                    : undefined
                }
                onClick={(e) => {
                  e.stopPropagation();
                  (e.currentTarget as HTMLButtonElement).blur();
                  if (option.value !== currentOwnership) {
                    mutation.mutate(option.value);
                  }
                }}
              >
                <OptionIcon
                  size={14}
                  className={OWNERSHIP_COLOR_CLASSES[option.value]}
                  fill={option.value !== TrackOwnership.NOT_OWNED ? "currentColor" : "none"}
                />
                {option.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
