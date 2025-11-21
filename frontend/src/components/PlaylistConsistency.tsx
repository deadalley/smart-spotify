import { PlaylistConsistencyAnalysis } from "@smart-spotify/shared";
import { AlertTriangle, CheckCircle2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  const getConsistencyLabel = (score: number) => {
    if (score >= 80) return "Highly Consistent";
    if (score >= 60) return "Moderately Consistent";
    return "Diverse/Eclectic";
  };

  const getDeviationColor = (score: number) => {
    if (score >= 80) return "bg-error/20 border-error";
    if (score >= 70) return "bg-warning/20 border-warning";
    return "bg-info/20 border-info";
  };

  return (
    <div className="space-y-6">
      {/* Consistency Score Card */}
      <div className="card bg-base-300 border border-base-200">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
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
            <div className="text-right">
              <div
                className={`text-4xl font-bold ${getConsistencyColor(
                  consistencyScore
                )}`}
              >
                {consistencyScore}
              </div>
              <div className="text-sm text-base-content/60">
                {getConsistencyLabel(consistencyScore)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Genres */}
      <div>
        <h4 className="text-sm font-medium text-base-content/70 uppercase tracking-wider mb-3">
          Main Genres
        </h4>
        <div className="flex flex-wrap gap-2">
          {mainGenres.map((genre) => (
            <span
              key={genre}
              className="badge badge-lg badge-primary capitalize"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>

      {/* Genre Outliers */}
      {outliers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-warning" />
            <h4 className="text-sm font-medium text-base-content/70 uppercase tracking-wider">
              Genre Outliers ({outliers.length})
            </h4>
          </div>
          <p className="text-sm text-base-content/60 mb-4">
            Artists whose genres significantly deviate from the playlist's main
            genres
          </p>

          <div className="space-y-3">
            {outliers.map((outlier) => {
              const artistImage =
                outlier.artist.images && outlier.artist.images.length > 0
                  ? outlier.artist.images[0].url
                  : null;

              return (
                <div
                  key={outlier.artist.id}
                  className={`card border ${getDeviationColor(
                    outlier.deviationScore
                  )} cursor-pointer hover:shadow-lg transition-all`}
                  onClick={() => navigate(`/artists/${outlier.artist.id}`)}
                >
                  <div className="card-body p-4">
                    <div className="flex items-start gap-4">
                      {/* Artist Image */}
                      <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 bg-base-300/50">
                        {artistImage ? (
                          <img
                            src={artistImage}
                            alt={outlier.artist.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User size={24} className="text-base-content/30" />
                          </div>
                        )}
                      </div>

                      {/* Artist Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <h5 className="font-semibold text-base truncate">
                              {outlier.artist.name}
                            </h5>
                            <p className="text-sm text-base-content/60">
                              {outlier.trackCount} track
                              {outlier.trackCount !== 1 ? "s" : ""} in playlist
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-2xl font-bold text-warning">
                              {outlier.deviationScore}
                            </div>
                            <div className="text-xs text-base-content/60">
                              deviation
                            </div>
                          </div>
                        </div>

                        {/* Genre Breakdown */}
                        <div className="space-y-2 mt-3">
                          {outlier.uniqueGenres.length > 0 && (
                            <div>
                              <div className="text-xs text-base-content/50 uppercase tracking-wider mb-1">
                                Unique Genres
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {outlier.uniqueGenres.map((genre) => (
                                  <span
                                    key={genre}
                                    className="badge badge-sm badge-error badge-outline capitalize"
                                  >
                                    {genre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {outlier.commonGenres.length > 0 && (
                            <div>
                              <div className="text-xs text-base-content/50 uppercase tracking-wider mb-1">
                                Shared Genres
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {outlier.commonGenres.map((genre) => (
                                  <span
                                    key={genre}
                                    className="badge badge-sm capitalize"
                                  >
                                    {genre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Outliers Message */}
      {outliers.length === 0 && (
        <div className="card bg-base-300 border border-base-200">
          <div className="card-body p-4 text-center">
            <CheckCircle2 size={32} className="text-success mx-auto mb-2" />
            <p className="text-base-content/70">
              No significant genre outliers detected. All artists align well
              with the playlist's main genres.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
