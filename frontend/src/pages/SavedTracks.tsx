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

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return <Error>Failed to load saved tracks. Please try again.</Error>;
  }

  if (!tracks || tracks.length === 0) {
    return (
      <Empty Icon={Heart}>
        <div className="text-center">
          <p className="text-lg mb-2">No saved tracks found</p>
          <p className="text-zinc-500">
            Like some songs on Spotify to see them here.
          </p>
        </div>
      </Empty>
    );
  }

  return (
    <Page>
      <Page.Header
        title="Liked Songs"
        subtitle={
          <span className="flex gap-2 items-center">
            <Heart size={16} />
            {tracks.length} track{tracks.length !== 1 ? "s" : ""}
          </span>
        }
      />

      <TrackList tracks={tracks} />
    </Page>
  );
}
