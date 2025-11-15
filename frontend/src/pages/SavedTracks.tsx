import { useMutation, useQuery } from "@tanstack/react-query";
import { Heart, Search } from "lucide-react";
import { Empty } from "../components/Empty";
import { Error } from "../components/Error";
import { Loading, PageLoading } from "../components/Loading";
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
    mutate: aggregateLikedSongs,
    data: aggregatedData,
    error: aggregatedError,
    isPending: isAggregatedLoading,
  } = useMutation({
    mutationFn: async () => {
      const response = await baseAPI.getAggregatedLikedSongs();
      return response.data;
    },
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
        action={
          <button
            className={`btn btn-primary btn-sm ${
              isAggregatedLoading ? "btn-disabled" : ""
            }`}
            disabled={isAggregatedLoading}
            onClick={() => aggregateLikedSongs()}
          >
            {isAggregatedLoading ? <Loading size="sm" /> : <Search size={14} />}
            Analyze
          </button>
        }
        subtitle={
          <span className="flex gap-2 items-center">
            <Heart size={16} />
            {tracks.length} track{tracks.length !== 1 ? "s" : ""}
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
