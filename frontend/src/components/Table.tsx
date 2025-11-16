import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ReactNode, useState } from "react";
import { TableSearch } from "./TableSearch";

export interface TableColumnMeta {
  span?: number;
  align?: "left" | "center" | "right";
}

export interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  onRowClick?: (row: T) => void;
  enableSorting?: boolean;
  enableFilter?: boolean;
  filterPlaceholder?: string;
  renderSubRow?: (row: Row<T>) => ReactNode;
  className?: string;
  filterClassName?: string;
  getRowKey?: (row: T, index: number) => string;
  externalFilter?: boolean;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
}

export function Table<T>({
  data,
  columns,
  onRowClick,
  enableSorting = true,
  enableFilter = false,
  filterPlaceholder = "Filter...",
  renderSubRow,
  className = "",
  filterClassName = "",
  getRowKey,
  externalFilter = false,
  globalFilter: externalGlobalFilter,
  onGlobalFilterChange: externalOnGlobalFilterChange,
}: TableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalGlobalFilter, setInternalGlobalFilter] = useState("");

  const globalFilter = externalFilter
    ? externalGlobalFilter ?? ""
    : internalGlobalFilter;
  const setGlobalFilter = externalFilter
    ? externalOnGlobalFilterChange ?? setInternalGlobalFilter
    : setInternalGlobalFilter;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter: globalFilter || "",
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    enableSorting,
    enableGlobalFilter: true,
  });

  const totalSpan = columns.reduce((sum, col) => {
    const meta = col.meta as TableColumnMeta | undefined;
    return sum + (meta?.span || 1);
  }, 0);

  return (
    <div className={`w-full flex flex-col h-fit ${className}`}>
      {enableFilter && !externalFilter && (
        <TableSearch
          value={globalFilter || ""}
          onChange={(value) => setGlobalFilter?.(value)}
          placeholder={filterPlaceholder}
          className={`w-full px-4 py-3 ${filterClassName}`}
        />
      )}

      <div
        className="grid gap-4 px-4 py-3 border-b border-base-200 text-base-content/50 text-xs font-medium uppercase tracking-wider bg-base-300/50"
        style={{
          gridTemplateColumns: `repeat(${totalSpan}, minmax(0, 1fr))`,
        }}
      >
        {table.getHeaderGroups().map((headerGroup) =>
          headerGroup.headers.map((header) => {
            const meta = header.column.columnDef.meta as
              | TableColumnMeta
              | undefined;
            const canSort = header.column.getCanSort();
            const sortDirection = header.column.getIsSorted();

            const alignClass =
              meta?.align === "right"
                ? "justify-end"
                : meta?.align === "center"
                ? "justify-center"
                : "justify-start";

            return (
              <div
                key={header.id}
                style={{
                  gridColumn: `span ${meta?.span || 1}`,
                }}
                className={canSort ? "cursor-pointer select-none" : ""}
                onClick={
                  canSort ? header.column.getToggleSortingHandler() : undefined
                }
              >
                <div className={`flex items-center gap-1 ${alignClass}`}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  {canSort && (
                    <span className="inline-flex">
                      {sortDirection === "asc" ? (
                        <ChevronUp size={12} />
                      ) : sortDirection === "desc" ? (
                        <ChevronDown size={12} />
                      ) : null}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {table.getRowModel().rows.map((row, index) => {
          const rowKey = getRowKey
            ? getRowKey(row.original, index)
            : `row-${index}`;

          return (
            <div key={rowKey}>
              <div
                className={`grid gap-4 px-4 py-3 hover:bg-base-300/50 transition-colors duration-150 border-b border-base-200 ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
                style={{
                  gridTemplateColumns: `repeat(${totalSpan}, minmax(0, 1fr))`,
                }}
                onClick={(e) => {
                  // Don't trigger row click if clicking on a button or interactive element
                  if (!(e.target as HTMLElement).closest("button")) {
                    onRowClick?.(row.original);
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | TableColumnMeta
                    | undefined;
                  const alignClass =
                    meta?.align === "right"
                      ? "justify-end"
                      : meta?.align === "center"
                      ? "justify-center"
                      : "justify-start";
                  return (
                    <div
                      key={cell.id}
                      style={{
                        gridColumn: `span ${meta?.span || 1}`,
                      }}
                      className={`flex items-center ${alignClass}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </div>
                  );
                })}
              </div>

              {renderSubRow && renderSubRow(row) && (
                <div className="border-b border-base-200 px-4 py-3">
                  {renderSubRow(row)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
