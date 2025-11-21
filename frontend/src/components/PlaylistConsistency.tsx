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
  const { consistencyScore, outliers, mainGenres, totalArtists } =
    consistencyAnalysis;

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-error";
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

      {/* Main Genres */}
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
                    {/* Artist Image */}
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

                    {/* Artist Info */}
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

                      {/* Genre Breakdown */}
                      {(outlier.uniqueGenres.length > 0 ||
                        outlier.commonGenres.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {outlier.uniqueGenres.map((genre) => (
                            <GenreBadge
                              key={genre}
                              genre={{ name: genre }}
                              size="sm"
                              variant={getBadgeVariant(outlier.deviationScore)}
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
  );
}
