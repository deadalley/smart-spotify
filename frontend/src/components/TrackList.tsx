import {
  Playlist,
  Track,
  TrackAggregationResult,
  TrackOwnership,
} from "@smart-spotify/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronUp,
  Circle,
  CircleCheck,
  Clock,
  Disc3,
  Heart,
  Star,
  Tag,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { baseAPI } from "../services/api";
import {
  formatDuration,
  getListenUrl,
  SOURCE_LABELS,
  TRACK_OWNERSHIP_OPTIONS,
} from "../utils";
import { buildLinks } from "../utils/buyLinks";
import { SpotifyLogo } from "./SpotifyLogo";
import { Table } from "./Table";
import { TableWrapper } from "./TableWrapper";
import { TrackAnalysisResult } from "./TrackAnalysisResult";
import { TrackOwnershipSelector } from "./TrackOwnershipSelector";
import { Tooltip } from "./Tooltip";
import { YouTubeLogo } from "./YouTubeLogo";

const OWNERSHIP_FILTER_ICONS: Record<TrackOwnership, typeof Circle> = {
  [TrackOwnership.NOT_OWNED]: Circle,
  [TrackOwnership.WISHLIST]: Star,
  [TrackOwnership.OWNED]: CircleCheck,
};

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
  const [ownershipFilter, setOwnershipFilter] = useState<Set<TrackOwnership>>(
    new Set(TRACK_OWNERSHIP_OPTIONS.map((option) => option.value))
  );
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

  const toggleOwnershipFilter = (state: TrackOwnership) => {
    setOwnershipFilter((prev) => {
      const next = new Set(prev);
      if (next.has(state)) {
        next.delete(state);
      } else {
        next.add(state);
      }
      return next;
    });
  };

  const data = useMemo(() => {
    const rows = aggregatedTracks
      ? aggregatedTracks.map((result) => ({
          track: result.track,
          trackAnalysisResult: result,
        }))
      : tracks.map((track) => ({ track, trackAnalysisResult: undefined }));

    return rows.filter((row) => ownershipFilter.has(row.track.ownership));
  }, [tracks, aggregatedTracks, ownershipFilter]);

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
        const albumImage = track.album.images?.[0]?.url;

        return (
          <div className="min-w-0 flex-1 flex items-center gap-3">
            <div className="size-10 shrink-0 rounded overflow-hidden bg-base-300/50 flex items-center justify-center">
              {albumImage ? (
                <img
                  src={albumImage}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <Disc3 size={16} className="text-base-content/30" />
              )}
            </div>

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
                {track.artistNames.map((name, i) => (
                  <span key={track.artistIds[i] ?? name}>
                    {i > 0 && ", "}
                    <Link
                      to={`/artists/${track.artistIds[i]}`}
                      className="hover:text-primary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {name}
                    </Link>
                  </span>
                ))}
              </p>
            </div>
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
    {
      id: "listen",
      header: "",
      meta: { span: 1, align: "center" },
      cell: ({ row }) => {
        const Logo = source === "youtube" ? YouTubeLogo : SpotifyLogo;
        const colorClass =
          source === "youtube"
            ? "text-[color:var(--color-primary-youtube)]"
            : "text-[color:var(--color-primary-spotify)]";
        return (
          <Tooltip content={`Listen on ${SOURCE_LABELS[source]}`}>
            <a
              href={getListenUrl(source, row.original.track.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-xs btn-circle p-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Logo className={`size-full ${colorClass}`} />
            </a>
          </Tooltip>
        );
      },
    },
    {
      id: "ownership",
      header: () => <Tag size={14} />,
      meta: { span: 1, align: "center" },
      cell: ({ row }) => (
        <TrackOwnershipSelector
          trackId={row.original.track.id}
          currentOwnership={row.original.track.ownership}
        />
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-base-content/50 text-xs font-medium uppercase tracking-wider">
          Filter:
        </span>
        {TRACK_OWNERSHIP_OPTIONS.map((option) => {
          const Icon = OWNERSHIP_FILTER_ICONS[option.value];
          const isActive = ownershipFilter.has(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleOwnershipFilter(option.value)}
              className={`btn btn-xs gap-1 ${
                isActive ? "btn-primary" : "btn-outline"
              }`}
            >
              <Icon size={12} />
              {option.label}
            </button>
          );
        })}
      </div>

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
    </div>
  );
}
