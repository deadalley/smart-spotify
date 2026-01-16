import { Album } from "@smart-spotify/shared";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Disc3, ExternalLink } from "lucide-react";
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

function getPrimaryArtistNameFromTracks(
  tracks: ReadonlyArray<{ artistNames: string[] }>
) {
  const counts = tracks
    .flatMap((t) => t.artistNames ?? [])
    .reduce(
      (acc, name) => acc.set(name, (acc.get(name) ?? 0) + 1),
      new Map<string, number>()
    );

  return (
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  );
}

function createBuyLinks({
  albumName,
  artistName,
}: {
  albumName: string;
  artistName?: string | null;
}) {
  const q = encodeURIComponent(
    [albumName, artistName].filter(Boolean).join(" ").trim()
  );

  // Qobuz locale format is typically "{country}-{language}" (e.g. "us-en", "de-de"),
  // while browsers usually expose "{language}-{country}" (e.g. "en-US", "de-DE").
  const getQobuzLocale = () => {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    const preferred =
      (nav?.languages ?? [])
        .map((l) => l.replace("_", "-"))
        .find((l) => l.toLowerCase().startsWith("de-")) ??
      nav?.language?.replace("_", "-") ??
      "de-DE";

    const [lang = "de", country = "de"] = preferred
      .split("-")
      .map((p) => p.toLowerCase());

    return `${country}-${lang}`;
  };

  const qobuzLocale = getQobuzLocale();

  return [
    {
      label: "Qobuz",
      href: `https://www.qobuz.com/${qobuzLocale}/search/albums/${q}`,
    },
    { label: "Bandcamp", href: `https://bandcamp.com/search?q=${q}` },
    { label: "Apple Music", href: `https://music.apple.com/search?term=${q}` },
    { label: "Discogs", href: `https://www.discogs.com/search/?q=${q}&type=release` },
    { label: "Amazon", href: `https://www.amazon.com/s?k=${q}` },
  ] as const;
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
  const primaryArtistName = getPrimaryArtistNameFromTracks(tracks);
  const buyLinks = createBuyLinks({
    albumName: album.name,
    artistName: primaryArtistName,
  });

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

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {buyLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
            title={`Search on ${link.label}`}
          >
            <ExternalLink className="size-4 mr-2" />
            {link.label}
          </a>
        ))}
      </div>

      {tracks.length === 0 ? (
        <Empty Icon={Disc3}>No tracks found</Empty>
      ) : (
        <TrackList tracks={tracks} />
      )}
    </Page>
  );
}

