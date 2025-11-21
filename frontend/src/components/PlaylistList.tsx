import { Playlist, TrackAggregationResult } from "@smart-spotify/shared";
import { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, Music } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PLAYLIST_TYPES } from "../utils";
import { GenreBadge } from "./GenreBadge";
import { SaveInPlaylist } from "./SaveInPlaylist";
import { Table } from "./Table";
import { TableWrapper } from "./TableWrapper";

type PlaylistColumn = ColumnDef<
  {
    playlist: Playlist;
    suggestedPlaylist?: TrackAggregationResult["suggestedPlaylists"][number];
  },
  unknown
>;

export function PlaylistList({
  playlists,
  trackAnalysisResult,
  enableFilter = false,
  externalFilter = false,
  globalFilter,
  onGlobalFilterChange,
}: {
  playlists: Playlist[];
  trackAnalysisResult?: TrackAggregationResult;
  enableFilter?: boolean;
  externalFilter?: boolean;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
}) {
  const navigate = useNavigate();
  const { suggestedPlaylists } = trackAnalysisResult || {};
  const [showAll, setShowAll] = useState(false);

  const data = useMemo(() => {
    if (suggestedPlaylists) {
      return suggestedPlaylists.map((sp) => ({
        playlist: sp.playlist,
        suggestedPlaylist: sp,
      }));
    }
    return playlists.map((playlist) => ({
      playlist,
      suggestedPlaylist: undefined,
    }));
  }, [playlists, suggestedPlaylists]);

  const suggestedColumns: PlaylistColumn[] = [
    {
      id: "name",
      accessorKey: "playlist",
      header: "Name",
      meta: { span: 3 },
      enableSorting: true,
      cell: ({ row }) => {
        const { playlist } = row.original;
        const playlistImage =
          playlist.images && playlist.images.length > 0
            ? playlist.images[0].url
            : null;

        return (
          <div className="min-w-0 flex-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-base-300/50">
              {playlistImage ? (
                <img
                  src={playlistImage}
                  alt={playlist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music size={20} className="text-base-content/30" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate text-base-content group-hover:text-primary transition-colors">
                {playlist.name}
              </p>
              <p className="text-base-content/50 text-sm flex items-center gap-2 mt-0.5">
                <Music size={12} />
                <span>{playlist.trackCount} tracks</span>
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "type",
      accessorFn: (row) => row.playlist.playlistType,
      header: "Type",
      meta: { span: 2 },
      enableSorting: true,
      cell: ({ row }) => {
        const { playlist } = row.original;
        return playlist.playlistType ? (
          <span className="badge badge-sm capitalize">
            {PLAYLIST_TYPES.find((type) => type.value === playlist.playlistType)
              ?.label ?? playlist.playlistType}
          </span>
        ) : null;
      },
    },
    {
      id: "artists",
      header: "Tracks by Same Artists",
      meta: { span: 3 },
      cell: ({ row }) => {
        const { suggestedPlaylist } = row.original;
        if (!suggestedPlaylist) return null;

        return (
          <div className="flex flex-wrap gap-2 items-center">
            {suggestedPlaylist.similarArtists.length > 0 ? (
              suggestedPlaylist.similarArtists.map((artist) => (
                <GenreBadge
                  key={artist.name}
                  genre={{ name: artist.name, count: artist.trackCount }}
                  variant="primary"
                />
              ))
            ) : (
              <span className="text-base-content/40 text-xs">None</span>
            )}
          </div>
        );
      },
    },
    {
      id: "genres",
      header: "Similar Genres",
      meta: { span: 2 },
      cell: ({ row }) => {
        const { suggestedPlaylist } = row.original;
        if (!suggestedPlaylist) return null;

        return (
          <div className="flex flex-wrap gap-2 items-center">
            {suggestedPlaylist.similarGenres.length > 0 ? (
              suggestedPlaylist.similarGenres.map((genre) => (
                <GenreBadge key={genre.name} genre={genre} />
              ))
            ) : (
              <span className="text-base-content/40 text-xs">None</span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      meta: { span: 2 },
      cell: () => <SaveInPlaylist />,
    },
  ];

  const simpleColumns: PlaylistColumn[] = [
    {
      id: "name",
      accessorKey: "playlist",
      header: "Name",
      meta: { span: 10 },
      enableSorting: true,
      cell: ({ row }) => {
        const { playlist } = row.original;
        const playlistImage = playlist.images[0]?.url;

        return (
          <div className="min-w-0 flex-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-base-300/50">
              {playlistImage ? (
                <img
                  src={playlistImage}
                  alt={playlist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music size={20} className="text-base-content/30" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 group">
              <p className="font-medium truncate text-base-content group-hover:text-primary transition-colors">
                {playlist.name}
              </p>
              <p className="text-base-content/50 text-sm flex items-center gap-2 mt-0.5">
                <Music size={12} />
                <span>{playlist.trackCount} tracks</span>
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "type",
      accessorFn: (row) => row.playlist.playlistType,
      header: "Type",
      meta: { span: 2 },
      enableSorting: true,
      cell: ({ row }) => {
        const { playlist } = row.original;
        return playlist.playlistType ? (
          <span className="badge badge-sm capitalize">
            {PLAYLIST_TYPES.find((type) => type.value === playlist.playlistType)
              ?.label ?? playlist.playlistType}
          </span>
        ) : null;
      },
    },
  ];

  // Columns for "show all" section - used in analysis results and main playlist view
  const showAllColumns: ColumnDef<
    {
      playlist: Playlist;
      suggestedPlaylist?: TrackAggregationResult["suggestedPlaylists"][number];
    },
    unknown
  >[] = [
    {
      id: "name",
      accessorFn: (row) => row.playlist.name,
      header: "Name",
      meta: { span: suggestedPlaylists ? 8 : 10 },
      enableSorting: true,
      cell: ({ row }) => {
        const { playlist } = row.original;
        const playlistImage =
          playlist.images && playlist.images.length > 0
            ? playlist.images[0].url
            : null;

        return (
          <div className="min-w-0 flex-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-base-300/50">
              {playlistImage ? (
                <img
                  src={playlistImage}
                  alt={playlist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music size={20} className="text-base-content/30" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate text-base-content group-hover:text-primary transition-colors">
                {playlist.name}
              </p>
              <p className="text-base-content/50 text-sm flex items-center gap-2 mt-0.5">
                <Music size={12} />
                <span>{playlist.trackCount} tracks</span>
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "type",
      accessorFn: (row) => row.playlist.playlistType,
      header: "Type",
      meta: { span: 2 },
      enableSorting: true,
      cell: ({ row }) => {
        const { playlist } = row.original;
        return playlist.playlistType ? (
          <span className="badge badge-sm capitalize">
            {PLAYLIST_TYPES.find((type) => type.value === playlist.playlistType)
              ?.label ?? playlist.playlistType}
          </span>
        ) : null;
      },
    },
    {
      id: "actions",
      header: "",
      meta: { span: 2 },
      cell: () => <SaveInPlaylist />,
    },
  ];

  const showAllData = useMemo(
    () =>
      playlists.map((playlist) => ({
        playlist,
        suggestedPlaylist: undefined,
      })),
    [playlists]
  );

  // If no track analysis result, use the showAllColumns for regular playlist view
  const columnsToUse = suggestedPlaylists
    ? suggestedColumns
    : enableFilter
    ? showAllColumns
    : simpleColumns;

  return (
    <TableWrapper>
      <Table
        data={enableFilter && !suggestedPlaylists ? showAllData : data}
        columns={columnsToUse}
        onRowClick={(row) => navigate(`/playlists/${row.playlist.id}`)}
        getRowKey={(row) => row.playlist.id}
        enableFilter={enableFilter && !externalFilter && !suggestedPlaylists}
        filterPlaceholder="Search playlist..."
        externalFilter={externalFilter}
        globalFilter={globalFilter}
        onGlobalFilterChange={onGlobalFilterChange}
      />

      {suggestedPlaylists && (
        <>
          <div
            className={`flex items-center justify-center text-sm px-4 py-3 ${
              showAll ? "border-b border-base-200" : ""
            }`}
          >
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showAll ? "Show less" : "Show all playlists"}
            </button>
          </div>

          {showAll && (
            <Table
              data={showAllData}
              columns={showAllColumns}
              onRowClick={(row) => navigate(`/playlists/${row.playlist.id}`)}
              getRowKey={(row) => `all-${row.playlist.id}`}
              className="playlist"
              enableFilter
              filterPlaceholder="Search playlist..."
            />
          )}
        </>
      )}
    </TableWrapper>
  );
}
