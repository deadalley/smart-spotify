import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Empty } from "../components/Empty";
import { Error } from "../components/Error";
import { PageLoading } from "../components/Loading";
import { Page } from "../components/Page";
import { TrackList } from "../components/TrackList";
import { baseAPI } from "../services/api";

export function SavedTracks() {
  const {
    data: tracks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["saved-tracks"],
    queryFn: async () => {
      const response = await baseAPI.getSavedTracks();
      return response.data;
    },
  });

  const {
    data: aggregatedData,
    error: aggregatedError,
    isLoading: isAggregatedLoading,
  } = useQuery({
    queryKey: ["aggregated-liked-songs"],
    queryFn: async () => {
      const response = await baseAPI.getAggregatedLikedSongs();
      return response.data;
    },
    enabled: !!tracks && tracks.length > 0,
  });

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return <Error>Failed to load saved tracks. Please try again.</Error>;
  }

  if (!tracks || tracks.length === 0) {
    return <Empty Icon={Heart}>No saved tracks found</Empty>;
  }

  return (
    <Page>
      <Page.Header
        title="Liked Songs"
        subtitle={
          <span className="flex gap-2 items-center">
            <Heart size={16} />
            {tracks.length} track{tracks.length !== 1 ? "s" : ""}
            {isAggregatedLoading && (
              <span className="text-primary text-sm ml-2">
                • Analyzing tracks...
              </span>
            )}
          </span>
        }
      />

      {aggregatedError && (
        <Error>Failed to load aggregated liked songs. Please try again.</Error>
      )}

      <TrackList aggregatedTracks={aggregatedData} tracks={tracks} />
    </Page>
  );
}
