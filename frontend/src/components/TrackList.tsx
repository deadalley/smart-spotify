import { Playlist, Track, TrackAggregationResult } from "@smart-spotify/shared";
import { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDuration } from "../utils";
import { Table } from "./Table";
import { TableWrapper } from "./TableWrapper";
import { TrackAnalysisResult } from "./TrackAnalysisResult";

export function TrackList({
  tracks,
  aggregatedTracks,
  playlists,
}: {
  tracks: Track[];
  aggregatedTracks?: TrackAggregationResult[];
  playlists?: Playlist[];
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const data = useMemo(() => {
    if (aggregatedTracks) {
      return aggregatedTracks.map((result) => ({
        track: result.track,
        trackAnalysisResult: result,
      }));
    }
    return tracks.map((track) => ({ track, trackAnalysisResult: undefined }));
  }, [tracks, aggregatedTracks]);

  const toggleRow = (rowKey: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowKey)) {
        newSet.delete(rowKey);
      } else {
        newSet.add(rowKey);
      }
      return newSet;
    });
  };

  const columns: ColumnDef<
    {
      track: Track;
      trackAnalysisResult?: TrackAggregationResult;
    },
    unknown
  >[] = [
    {
      id: "index",
      header: "#",
      meta: { span: 1 },
      cell: ({ row }) => (
        <span className="text-base-content/50 text-sm group-hover:text-base-content/70 transition-colors">
          {row.index + 1}
        </span>
      ),
    },
    {
      id: "title",
      accessorKey: "track",
      header: "Title",
      meta: { span: 6 },
      enableSorting: true,
      cell: ({ row }) => {
        const { track, trackAnalysisResult } = row.original;
        const rowKey = `${track.id}-${row.index}`;
        const isExpanded = expandedRows.has(rowKey);

        return (
          <div className="min-w-0 flex-1">
            <div className="flex gap-2 items-center">
              <p className="font-medium truncate text-base-content group-hover:text-primary transition-colors">
                {track.name}
              </p>
              {trackAnalysisResult && (
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRow(rowKey);
                  }}
                >
                  {isExpanded ? (
                    <ChevronUp size={12} />
                  ) : (
                    <ChevronDown size={12} />
                  )}
                </button>
              )}
            </div>
            <p className="text-base-content/50 text-sm truncate mt-0.5">
              {track.artistNames.join(", ")}
            </p>
          </div>
        );
      },
    },
    {
      id: "album",
      accessorFn: (row) => row.track.album.name,
      header: "Album",
      meta: { span: 3 },
      enableSorting: true,
      cell: ({ row }) => (
        <div className="min-w-0 flex-1">
          <p className="text-base-content/70 text-sm truncate">
            {row.original.track.album.name}
          </p>
        </div>
      ),
    },
    {
      id: "duration",
      accessorFn: (row) => row.track.durationMs,
      header: () => <Clock size={14} />,
      meta: { span: 2, align: "right" },
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-base-content/50 text-sm tabular-nums">
          {formatDuration(row.original.track.durationMs)}
        </span>
      ),
    },
  ];

  return (
    <TableWrapper>
      <Table
        data={data}
        columns={columns}
        getRowKey={(row, index) => `${row.track.id}-${index}`}
        renderSubRow={
          aggregatedTracks
            ? (row) => {
                const { trackAnalysisResult, track } = row.original;
                const rowKey = `${track.id}-${row.index}`;

                if (!trackAnalysisResult || !expandedRows.has(rowKey))
                  return null;

                return (
                  <div className="grid grid-cols-12">
                    <div className="col-span-1"></div>
                    <div className="col-span-11">
                      <TrackAnalysisResult
                        trackAnalysisResult={trackAnalysisResult}
                        playlists={playlists}
                      />
                    </div>
                  </div>
                );
              }
            : undefined
        }
      />
    </TableWrapper>
  );
}
