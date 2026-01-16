import { PlaylistConsistencyAnalysis } from "@smart-spotify/shared";
import { AlertTriangle, CheckCircle2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GenreBadge } from "./GenreBadge";
import { Table } from "./Table";
import { TableWrapper } from "./TableWrapper";

export function PlaylistConsistency({
  consistencyAnalysis,
}: {
  consistencyAnalysis: PlaylistConsistencyAnalysis;
}) {
  const navigate = useNavigate();
  const {
    consistencyScore,
    genreScore,
    timeScore,
    outliers,
    mainGenres,
    totalArtists,
    timeAnalysis,
  } = consistencyAnalysis;

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-error";
  };

  const getScoreBorder = (score: number) => {
    if (score >= 80) return "border-success/30";
    if (score >= 60) return "border-warning/30";
    return "border-error/30";
  };

  const getBadgeVariant = (score: number) => {
    if (score >= 80) return "error";
    if (score >= 70) return "warning";
    return "default";
  };

  return (
    <div className="space-y-6">
      {/* Consistency Score Card */}
      <div className="card bg-base-300 border border-base-200 p-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          {consistencyScore >= 70 ? (
            <CheckCircle2 size={24} className="text-success" />
          ) : (
            <AlertTriangle size={24} className="text-warning" />
          )}
          <div>
            <h3 className="font-semibold text-lg">
              Playlist Consistency Score
            </h3>
            <p className="text-sm text-base-content/60">
              Based on genre alignment across {totalArtists} artists
              {timeScore !== undefined ? " and time spread" : ""}
            </p>
          </div>
        </div>
        <div
          className={`text-right text-4xl font-bold ${getConsistencyColor(
            consistencyScore
          )}`}
        >
          {consistencyScore}
        </div>
      </div>

      <div className="my-4 divider" />
      <h3 className="text-lg font-semibold uppercase">Genre Analysis</h3>
      <div className="space-y-4">
        {genreScore !== undefined && (
          <div
            className={`card bg-base-300 border p-4 ${getScoreBorder(
              genreScore
            )}`}
          >
            <p className="text-sm text-base-content/60">Genre score</p>
            <p
              className={`text-2xl font-bold ${getConsistencyColor(
                genreScore
              )}`}
            >
              {genreScore}
            </p>
            <p className="text-xs text-base-content/60 mt-1">
              Higher means artists’ genres better match the playlist’s genre
              distribution.
            </p>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium text-base-content/70 uppercase tracking-wider mb-3">
            Main Genres
          </h4>
          <div className="flex flex-wrap gap-2">
            {mainGenres.map((genre) => (
              <GenreBadge key={genre} genre={{ name: genre }} size="lg" />
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-base-content/70 uppercase tracking-wider mb-3">
            Genre Outliers
          </h4>
          {outliers.length === 0 ? (
            <div className="card bg-base-300 border border-base-200 p-4 text-center">
              <CheckCircle2 size={32} className="text-success mx-auto mb-2" />
              <p className="text-base-content/70">
                No significant genre outliers detected.
              </p>
            </div>
          ) : (
            <TableWrapper>
              <Table
                data={outliers}
                enableFilter={false}
                enableSorting={true}
                getRowKey={(row) => row.artist.id}
                onRowClick={(row) => navigate(`/artists/${row.artist.id}`)}
                columns={[
                  {
                    id: "artist",
                    header: "Artist",
                    meta: { span: 6 },
                    cell: ({ row }) => {
                      const outlier = row.original;
                      const artistImage = outlier.artist.images[0]?.url;
                      return (
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-base-300/50">
                            {artistImage ? (
                              <img
                                src={artistImage}
                                alt={outlier.artist.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User
                                  size={18}
                                  className="text-base-content/30"
                                />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">
                              {outlier.artist.name}
                            </div>
                            <div className="text-xs text-base-content/60 truncate">
                              {outlier.uniqueGenres.slice(0, 2).join(", ")}
                              {outlier.uniqueGenres.length > 2 ? "…" : ""}
                            </div>
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    id: "tracks",
                    header: "Tracks",
                    meta: { span: 2, align: "center" },
                    accessorFn: (row) => row.trackCount,
                    cell: ({ row }) => (
                      <span className="text-sm text-base-content/70 tabular-nums">
                        {row.original.trackCount}
                      </span>
                    ),
                  },
                  {
                    id: "genres",
                    header: "Genres",
                    meta: { span: 4 },
                    cell: ({ row }) => {
                      const outlier = row.original;
                      const unique = outlier.uniqueGenres.slice(0, 4);
                      const common = outlier.commonGenres.slice(0, 2);
                      return (
                        <div className="flex flex-wrap gap-1 justify-start">
                          {unique.map((g) => (
                            <GenreBadge
                              key={`u-${outlier.artist.id}-${g}`}
                              genre={{ name: g }}
                              size="xs"
                              variant={getBadgeVariant(outlier.deviationScore)}
                            />
                          ))}
                          {common.map((g) => (
                            <GenreBadge
                              key={`c-${outlier.artist.id}-${g}`}
                              genre={{ name: g }}
                              size="xs"
                              variant="default"
                            />
                          ))}
                        </div>
                      );
                    },
                  },
                ]}
              />
            </TableWrapper>
          )}
        </div>
      </div>

      <div className="my-4 divider" />
      <h3 className="text-lg font-semibold uppercase">Time Analysis</h3>
      {timeAnalysis ? (
        <div className="space-y-4">
          <div className="flex flex-row items-center justify-between gap-3">
            {timeScore !== undefined && (
              <div
                className={`card bg-base-300 border p-4 flex-1 ${getScoreBorder(
                  timeScore
                )}`}
              >
                <p className="text-sm text-base-content/60">Time score</p>
                <p
                  className={`text-2xl font-bold ${getConsistencyColor(
                    timeScore
                  )}`}
                >
                  {timeScore}
                </p>
                <p className="text-xs text-base-content/60 mt-1">
                  Higher means releases cluster in a tighter year range
                  (IQR-based).
                </p>
              </div>
            )}

            <div className="card bg-base-300 border border-base-200 p-4 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-base-content/60">Year Range</p>
                  <p className="text-lg font-semibold">
                    {timeAnalysis.yearRange.min} - {timeAnalysis.yearRange.max}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-base-content/60">Median Year</p>
                  <p className="text-lg font-semibold">
                    {timeAnalysis.medianYear}
                  </p>
                </div>
              </div>
              {timeAnalysis.iqrYears !== undefined && (
                <div className="mt-3 text-sm text-base-content/70">
                  IQR:{" "}
                  <span className="font-semibold">{timeAnalysis.iqrYears}</span>{" "}
                  years
                  {timeAnalysis.outlierBounds && (
                    <>
                      {" "}
                      • Outlier bounds:{" "}
                      <span className="font-semibold">
                        {timeAnalysis.outlierBounds.lower}–
                        {timeAnalysis.outlierBounds.upper}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {timeAnalysis.decadeDistribution.length > 0 && (
            <div>
              <p className="text-xs text-base-content/60 mb-2">
                Distribution by Decade
              </p>
              <div className="card bg-base-300 border border-base-200 p-4 items-center">
                <div className="w-fit flex items-center gap-4 h-48">
                  {timeAnalysis.decadeDistribution.map((decade) => {
                    const maxPercentage = Math.max(
                      ...timeAnalysis.decadeDistribution.map(
                        (d) => d.percentage
                      )
                    );
                    const barHeight = (decade.percentage / maxPercentage) * 100;

                    return (
                      <div
                        key={decade.decade}
                        className="flex flex-col items-center justify-end flex-1 min-w-0 h-full"
                      >
                        <div className="flex flex-col items-center mb-1">
                          <span className="text-xs font-semibold text-base-content">
                            {decade.percentage}%
                          </span>
                          <span className="text-xs text-base-content/60">
                            {decade.count}
                          </span>
                        </div>
                        <div
                          className="w-4 rounded-t-2xl bg-primary/20 border border-primary transition-all duration-500 ease-out"
                          style={{ height: `${barHeight}%` }}
                        />
                        <span className="text-xs font-medium mt-2 text-center">
                          {decade.decade}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {timeAnalysis.timeOutliers.length > 0 && (
            <div>
              <p className="text-xs text-base-content/60 mb-2">
                Time Period Outliers ({timeAnalysis.timeOutliers.length})
              </p>
              <div className="space-y-2">
                {timeAnalysis.timeOutliers.map((outlier) => (
                  <div
                    key={outlier.track.id}
                    className="card bg-base-300 border border-warning/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">
                          {outlier.track.name}
                        </p>
                        <p className="text-xs text-base-content/60 truncate">
                          {outlier.track.artistNames.join(", ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="badge badge-warning">
                          {outlier.releaseYear}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-base-content/70">
          No year data available for this playlist.
        </div>
      )}
    </div>
  );
}
