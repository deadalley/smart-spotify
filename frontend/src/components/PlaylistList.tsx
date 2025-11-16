import { Playlist, TrackAggregationResult } from "@smart-spotify/shared";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { PlaylistRow } from "./PlaylistRow";

export type PlaylistColumn = {
  key: string;
  label: string;
  span: number;
};

type PlaylistListColumns = {
  primary: PlaylistColumn[];
  secondary?: PlaylistColumn[];
};

export function PlaylistList({
  playlists,
  trackAnalysisResult,
  columns,
}: {
  playlists: Playlist[];
  trackAnalysisResult?: TrackAggregationResult;
  columns?: PlaylistListColumns;
}) {
  const { suggestedPlaylists } = trackAnalysisResult || {};

  const [showAll, setShowAll] = useState(false);

  // Default columns configuration
  const defaultColumns: PlaylistListColumns = suggestedPlaylists
    ? {
        primary: [
          { key: "name", label: "Name", span: 3 },
          { key: "type", label: "Type", span: 2 },
          { key: "artists", label: "Tracks by Same Artists", span: 3 },
          { key: "genres", label: "Similar Genres", span: 2 },
          { key: "actions", label: "", span: 2 },
        ],
        secondary: [
          { key: "name", label: "Name", span: 8 },
          { key: "type", label: "Type", span: 2 },
          { key: "actions", label: "", span: 2 },
        ],
      }
    : {
        primary: [
          { key: "name", label: "Name", span: 10 },
          { key: "type", label: "Type", span: 2 },
        ],
      };

  const activeColumns = columns || defaultColumns;

  return (
    <div className="bg-base-300 rounded-lg overflow-hidden border border-zinc-800/50 w-full flex flex-col h-fit">
      <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-zinc-800/50 text-base-content/50 text-xs font-medium uppercase tracking-wider bg-base-300/50">
        {activeColumns.primary.map((column) => (
          <div key={column.key} className={`col-span-${column.span}`}>
            {column.label}
          </div>
        ))}
      </div>

      <div className="overflow-y-auto flex-1">
        {suggestedPlaylists
          ? suggestedPlaylists.map((suggestedPlaylist, index) => (
              <PlaylistRow
                key={`${suggestedPlaylist.playlist.id}-${index}`}
                playlist={suggestedPlaylist.playlist}
                track={trackAnalysisResult?.track}
                suggestedPlaylist={suggestedPlaylist}
              />
            ))
          : playlists.map((playlist, index) => (
              <PlaylistRow
                key={`${playlist.id}-${index}`}
                playlist={playlist}
              />
            ))}

        {suggestedPlaylists && (
          <div
            className={`col-span-12 flex items-center justify-center text-sm border-zinc-800/50 p-2 ${
              showAll ? "border-b" : ""
            }`}
          >
            <button
              className="btn btn-ghost"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showAll ? "Show less" : "Show all playlists"}
            </button>
          </div>
        )}

        {showAll && suggestedPlaylists && activeColumns.secondary && (
          <>
            <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-zinc-800/50 text-base-content/50 text-xs font-medium uppercase tracking-wider bg-base-300/50 sticky top-0">
              {activeColumns.secondary.map((column) => (
                <div key={column.key} className={`col-span-${column.span}`}>
                  {column.label}
                </div>
              ))}
            </div>
            {playlists.map((playlist, index) => (
              <PlaylistRow
                key={`all-${playlist.id}-${index}`}
                playlist={playlist}
                track={trackAnalysisResult?.track}
                showAddButton
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
