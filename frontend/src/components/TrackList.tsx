import { Playlist, Track, TrackAggregationResult } from "@smart-spotify/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, Clock, Heart } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { baseAPI } from "../services/api";
import { formatDuration } from "../utils";
import { buildLinks } from "../utils/buyLinks";
import { Table } from "./Table";
import { TableWrapper } from "./TableWrapper";
import { TrackAnalysisResult } from "./TrackAnalysisResult";
import { Tooltip } from "./Tooltip";

export function TrackList({
  tracks,
  aggregatedTracks,
  playlists,
  showUnlike = false,
}: {
  tracks: Track[];
  aggregatedTracks?: TrackAggregationResult[];
  playlists?: Playlist[];
  showUnlike?: boolean;
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { enabledServices } = useSettings();
  const { source } = useAuth();

  const unlikeTrackMutation = useMutation({
    mutationFn: async (trackId: string) => {
      return baseAPI.unlikeTrack(trackId);
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["saved-tracks"] });
      queryClient.invalidateQueries({ queryKey: ["aggregated-liked-songs"] });
    },
  });

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
      meta: { span: 5 },
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
    // YouTube Music has no real album metadata (tracks are grouped by
    // channel, which is already shown as the artist), so the column would
    // just repeat the artist name — only show it for Spotify.
    ...(source === "spotify"
      ? [
          {
            id: "album",
            accessorFn: (row) => row.track.album.name,
            header: "Album",
            meta: { span: 1 },
            enableSorting: true,
            cell: ({ row }) => (
              <div className="min-w-0 flex-1">
                <Link
                  to={`/albums/${row.original.track.album.id}`}
                  className="block text-base-content/70 text-sm truncate hover:text-primary transition-colors max-w-full"
                  onClick={(e) => e.stopPropagation()}
                  title={row.original.track.album.name}
                >
                  {row.original.track.album.name}
                </Link>
              </div>
            ),
          } satisfies ColumnDef<
            { track: Track; trackAnalysisResult?: TrackAggregationResult },
            unknown
          >,
        ]
      : []),
    {
      id: "year",
      accessorFn: (row) => row.track.album.releaseDate,
      header: "Year",
      meta: { span: 1, align: "center" },
      enableSorting: true,
      cell: ({ row }) => {
        const year = row.original.track.album.releaseDate?.substring(0, 4);
        return (
          <span className="text-base-content/50 text-sm tabular-nums">
            {year || "—"}
          </span>
        );
      },
    },
    {
      id: "duration",
      accessorFn: (row) => row.track.durationMs,
      header: () => <Clock size={14} />,
      meta: { span: showUnlike ? 1 : 2, align: "right" },
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-base-content/50 text-sm tabular-nums">
          {formatDuration(row.original.track.durationMs)}
        </span>
      ),
    },
  ];

  if (enabledServices.length > 0) {
    columns.push({
      id: "buy",
      header: "",
      meta: { span: 2, align: "right" },
      cell: ({ row }) => {
        const { track } = row.original;
        const links = buildLinks({
          entityType: "track",
          name: track.name,
          artistName: track.artistNames[0],
          services: enabledServices,
        });

        return (
          <div className="flex flex-wrap items-center justify-end gap-1">
            {links.map((link) => (
              <Tooltip key={link.service} content={`Search on ${link.label}`}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-xs btn-circle p-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={link.icon}
                    alt={link.label}
                    className="size-full rounded-sm"
                  />
                </a>
              </Tooltip>
            ))}
          </div>
        );
      },
    });
  }

  if (showUnlike) {
    columns.push({
      id: "unlike",
      header: "",
      meta: { span: 1, align: "center" },
      cell: ({ row }) => (
        <button
          className="btn btn-ghost btn-sm btn-circle text-primary"
          onClick={(e) => {
            e.stopPropagation();
            unlikeTrackMutation.mutate(row.original.track.id);
          }}
          disabled={unlikeTrackMutation.isPending}
          title="Remove from Liked Songs"
        >
          <Heart size={16} fill="currentColor" stroke="currentColor" />
        </button>
      ),
    });
  }

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
