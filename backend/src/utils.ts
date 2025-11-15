import { Artist, Playlist, PlaylistData } from "@smart-spotify/shared";

export function getGenres(
  artists: Artist[]
): { name: string; count: number }[] {
  return Object.entries(
    artists.reduce<Record<string, number>>((acc, artist) => {
      artist.genres.forEach((genre) => {
        if (acc[genre]) {
          acc[genre] += 1;
        } else {
          acc[genre] = 1;
        }
      });
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));
}

export function isTrackInPlaylist(
  trackId: string,
  playlistData: Record<string, PlaylistData>
) {
  return (playlist: Playlist) =>
    playlist.id !== "liked-songs" &&
    (playlistData[playlist.id]?.tracks || []).some(
      (track) => track.id === trackId
    );
}

export function isTrackNotInPlaylist(
  trackId: string,
  playlistData: Record<string, PlaylistData>
) {
  return (playlist: Playlist) =>
    playlist.id === "liked-songs" ||
    !(playlistData[playlist.id]?.tracks || []).some(
      (track) => track.id === trackId
    );
}
