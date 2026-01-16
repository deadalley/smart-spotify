import { Album } from "@smart-spotify/shared";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Disc3 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Empty } from "../components/Empty";
import { Error } from "../components/Error";
import { PageLoading } from "../components/Loading";
import { Page } from "../components/Page";
import { SpotifyLink } from "../components/SpotifyLink";
import { TrackList } from "../components/TrackList";
import { baseAPI } from "../services/api";

function getBestAlbumImage(album: Album) {
  const images = album.images ?? [];
  if (images.length === 0) return null;
  return images[0]?.url ?? null;
}

export function AlbumView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: album,
    isLoading: isAlbumLoading,
    error: albumError,
  } = useQuery({
    queryKey: ["album", id],
    queryFn: async () => {
      const response = await baseAPI.getAlbum(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const {
    data: tracks,
    isLoading: isTracksLoading,
    error: tracksError,
  } = useQuery({
    queryKey: ["album-tracks", id],
    queryFn: async () => {
      const response = await baseAPI.getAlbumTracks(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const isLoading = isAlbumLoading || isTracksLoading;
  const error = albumError || tracksError;

  if (isLoading) {
    return <PageLoading />;
  }

  if (error || !album || !tracks) {
    return <Error>Failed to load album. Please try again.</Error>;
  }

  const albumImage = getBestAlbumImage(album);
  const year = album.releaseDate?.substring(0, 4);

  return (
    <Page>
      <div className="mb-6">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="size-4 mr-2" />
          Back
        </button>
      </div>

      <Page.Header
        title={
          <div className="flex items-center gap-3">
            <div className="size-16 rounded-lg overflow-hidden shrink-0">
              {albumImage ? (
                <img
                  src={albumImage}
                  alt={album.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center text-white">
                  <Disc3 className="w-10 h-10" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span>{album.name}</span>
              <span className="text-sm text-base-content/70">
                {year ? `${year} • ` : ""}
                {album.totalTracks ?? tracks.length} track
                {(album.totalTracks ?? tracks.length) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        }
        action={
          album.externalUrls?.spotify ? (
            <SpotifyLink href={album.externalUrls.spotify} />
          ) : undefined
        }
      />

      {tracks.length === 0 ? (
        <Empty Icon={Disc3}>No tracks found</Empty>
      ) : (
        <TrackList tracks={tracks} />
      )}
    </Page>
  );
}

