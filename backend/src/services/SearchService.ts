import {
  LibrarySearchResult,
  SearchResultGroup,
  Track,
} from "@smart-spotify/shared";
import { RedisService } from "./RedisService";

const MAX_RESULTS_PER_SECTION = 8;

function matches(query: string, ...fields: (string | undefined)[]): boolean {
  return fields.some((field) => field?.toLowerCase().includes(query));
}

function toGroup<T>(matched: T[]): SearchResultGroup<T> {
  return {
    items: matched.slice(0, MAX_RESULTS_PER_SECTION),
    totalCount: matched.length,
  };
}

function derivePrimaryArtistName(tracks: Track[]): string | null {
  const counts = tracks
    .flatMap((t) => t.artistNames ?? [])
    .reduce(
      (acc, name) => acc.set(name, (acc.get(name) ?? 0) + 1),
      new Map<string, number>()
    );

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function deriveAlbums(tracks: Track[]) {
  const tracksByAlbumId = new Map<string, Track[]>();

  for (const track of tracks) {
    const album = track.album;
    if (!album?.id) continue;
    const existing = tracksByAlbumId.get(album.id);
    if (existing) {
      existing.push(track);
    } else {
      tracksByAlbumId.set(album.id, [track]);
    }
  }

  return [...tracksByAlbumId.entries()].map(([, albumTracks]) => ({
    ...albumTracks[0].album,
    artistName: derivePrimaryArtistName(albumTracks),
  }));
}

export class SearchService {
  constructor(private redisService: RedisService) {}

  async search(userId: string, query: string): Promise<LibrarySearchResult> {
    const q = query.toLowerCase();

    const [tracks, artists, playlists] = await Promise.all([
      this.redisService.getUserTracks(userId),
      this.redisService.getUserArtists(userId),
      this.redisService.getUserPlaylists(userId),
    ]);

    const matchedTracks = tracks.filter((t) =>
      matches(q, t.name, ...(t.artistNames ?? []))
    );

    const matchedAlbums = deriveAlbums(tracks).filter((a) =>
      matches(q, a.name)
    );

    const matchedArtists = artists.filter((a) => matches(q, a.name));

    const matchedPlaylists = playlists
      .filter((p) => p.id !== "liked-songs")
      .filter((p) => matches(q, p.name));

    return {
      tracks: toGroup(matchedTracks),
      albums: toGroup(matchedAlbums),
      artists: toGroup(matchedArtists),
      playlists: toGroup(matchedPlaylists),
    };
  }
}
