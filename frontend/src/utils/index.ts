import { PlaylistType } from "@smart-spotify/shared";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import type { AuthSource } from "../contexts/AuthContext";

dayjs.extend(duration);

export const SOURCE_LABELS: Record<AuthSource, string> = {
  spotify: "Spotify",
  youtube: "YouTube Music",
};

export function getAppName(source: AuthSource): string {
  return `Smart ${SOURCE_LABELS[source]}`;
}

// Opens straight into playback where possible: YouTube's watch page autoplays
// by default, and Spotify's embed player autoplays a preview when given
// autoplay=1 (the regular open.spotify.com track page does not autoplay).
export function getListenUrl(source: AuthSource, trackId: string): string {
  return source === "spotify"
    ? `https://open.spotify.com/embed/track/${trackId}?autoplay=1`
    : `https://www.youtube.com/watch?v=${trackId}`;
}

export function formatDuration(ms: number): string {
  const dur = dayjs.duration(ms);
  const hours = dur.hours();
  const minutes = dur.minutes();
  const seconds = dur.seconds();

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}

export const PLAYLIST_TYPES = [
  { value: PlaylistType.MOOD, label: "Mood" },
  { value: PlaylistType.GENRE, label: "Genre" },
  { value: PlaylistType.COLLECTION, label: "Collection" },
  { value: PlaylistType.ARTIST, label: "Artist" },
  { value: PlaylistType.OTHER, label: "Other" },
];
