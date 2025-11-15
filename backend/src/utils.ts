import { Artist } from "@smart-spotify/shared";

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
