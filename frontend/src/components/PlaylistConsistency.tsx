import { PlaylistConsistencyAnalysis } from "@smart-spotify/shared";
import { AlertTriangle, CheckCircle2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GenreBadge } from "./GenreBadge";

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

  const getDeviationColor = (score: number) => {
    if (score >= 80) return "bg-error/5 border-error/30";
    if (score >= 70) return "bg-warning/5 border-warning/30";
    return "bg-info/10 border-info/30";
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
            <div className="space-y-2">
              {outliers.map((outlier) => {
                const artistImage = outlier.artist.images[0]?.url;

                return (
                  <div
                    key={outlier.artist.id}
                    className={`card border ${getDeviationColor(
                      outlier.deviationScore
                    )} p-3 cursor-pointer hover:shadow-lg transition-all`}
                    onClick={() => navigate(`/artists/${outlier.artist.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-base-300/50">
                        {artistImage ? (
                          <img
                            src={artistImage}
                            alt={outlier.artist.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={20} className="text-base-content/30" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <h5 className="font-semibold truncate">
                              {outlier.artist.name}
                            </h5>
                            <p className="text-xs text-base-content/60">
                              {outlier.trackCount} track
                              {outlier.trackCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="text-xl font-bold text-warning shrink-0">
                            {outlier.deviationScore}
                          </div>
                        </div>

                        {(outlier.uniqueGenres.length > 0 ||
                          outlier.commonGenres.length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {outlier.uniqueGenres.map((genre) => (
                              <GenreBadge
                                key={genre}
                                genre={{ name: genre }}
                                size="sm"
                                variant={getBadgeVariant(
                                  outlier.deviationScore
                                )}
                              />
                            ))}
                            {outlier.commonGenres.map((genre) => (
                              <GenreBadge
                                key={genre}
                                genre={{ name: genre }}
                                size="sm"
                                variant="default"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
