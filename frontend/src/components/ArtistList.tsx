import { Artist } from "@smart-spotify/shared";
import { ColumnDef } from "@tanstack/react-table";
import { Music, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Table } from "./Table";
import { TableWrapper } from "./TableWrapper";

export function ArtistList({ artists }: { artists: Artist[] }) {
  const navigate = useNavigate();

  const columns: ColumnDef<Artist, unknown>[] = [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      meta: { span: 10 },
      enableSorting: true,
      cell: ({ row }) => {
        const artist = row.original;
        const artistImage =
          artist.images && artist.images.length > 0
            ? artist.images[0].url
            : null;

        return (
          <div className="min-w-0 flex-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
              {artistImage ? (
                <img
                  src={artistImage}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-primary/40 to-primary/60 flex items-center justify-center">
                  <User className="w-5 h-5 text-base-content" />
                </div>
              )}
            </div>
            <p className="font-medium truncate text-base-content group-hover:text-primary transition-colors">
              {artist.name}
            </p>
          </div>
        );
      },
    },
    {
      id: "trackCount",
      accessorKey: "trackCount",
      header: "Tracks",
      meta: { span: 2 },
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <span className="text-base-content/50 text-sm flex items-center gap-2">
            <Music size={12} />
            {row.original.trackCount ?? 0}
          </span>
        </div>
      ),
    },
  ];

  return (
    <TableWrapper>
      <Table
        data={artists}
        columns={columns}
        onRowClick={(artist) => navigate(`/artists/${artist.id}`)}
        getRowKey={(artist) => artist.id}
      />
    </TableWrapper>
  );
}
