import {
  Artist,
  DecadeDistribution,
  GenreOutlier,
  Playlist,
  PlaylistData,
  TimeOutlier,
  Track,
  TrackAggregationResult,
} from "@smart-spotify/shared";
import { isTrackInPlaylist, isTrackNotInPlaylist } from "../utils";
import { RedisService } from "./RedisService";

type GenreInfo = {
  normalized: string;
  tokens: Set<string>;
  roots: Set<string>;
};

function normalizeGenreName(name: string): string {
  // Normalize common punctuation/formatting so small variations still match.
  return (
    name
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[()]/g, " ")
      .replace(/[.,:;'"!?]/g, " ")
      .replace(/[-/]/g, " ")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

function getGenreInfo(name: string): GenreInfo {
  const normalized = normalizeGenreName(name);
  const parts = normalized.split(" ").filter(Boolean);

  const tokens = new Set(
    parts
      .map((p) => p.trim())
      .filter(Boolean)
      // Filter very short tokens to reduce noise (e.g., "a", "i", "k")
      .filter((t) => t.length >= 2)
  );

  const roots = new Set<string>();
  if (parts.length > 0) {
    roots.add(parts[parts.length - 1]); // e.g. "yacht rock" -> "rock"
  }
  if (parts.length >= 2) {
    roots.add(`${parts[parts.length - 2]} ${parts[parts.length - 1]}`); // e.g. "soul rock"
  }

  // Treat common multi-word genre families as roots too.
  const normalizedSpaced = ` ${normalized} `;
  if (normalizedSpaced.includes(" hip hop ")) roots.add("hip hop");
  if (normalizedSpaced.includes(" drum and bass ")) roots.add("drum and bass");
  if (normalizedSpaced.includes(" r and b ")) roots.add("r and b");

  return { normalized, tokens, roots };
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) {
    if (b.has(x)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function genreSimilarity(a: GenreInfo, b: GenreInfo): number {
  if (a.normalized === b.normalized) return 1;

  // Strong match on "family" root, e.g. "glam rock" ~ "rock".
  for (const r of a.roots) {
    if (b.roots.has(r) && r.length >= 3) return 0.88;
  }

  // Token overlap as a softer fallback.
  const j = jaccardSimilarity(a.tokens, b.tokens);
  if (j <= 0) return 0;
  // Keep this conservative to avoid accidental matches on generic tokens.
  return Math.min(0.65, 0.65 * j);
}

export class PlaylistService {
  constructor(private redisService: RedisService) {}

  async aggregatePlaylists(userId: string): Promise<Playlist[]> {
    const playlists = await this.redisService.getUserPlaylists(userId);
    // Placeholder for playlist aggregation logic
    return playlists;
  }

  async aggregateLikedSongs(userId: string): Promise<TrackAggregationResult[]> {
    const playlists = await this.redisService.getUserPlaylists(userId);
    const playlistData: Record<string, PlaylistData> = {};

    // Load all playlist data except liked-songs
    for (const playlist of playlists) {
      if (playlist.id === "liked-songs") {
        continue;
      }

      const data = await this.redisService.getPlaylistData(userId, playlist.id);
      if (data) {
        playlistData[playlist.id] = data;
      }
    }

    const likedTracks = await this.redisService.getPlaylistTracks(
      userId,
      "liked-songs"
    );

    const result: TrackAggregationResult[] = [];

    for (const track of likedTracks) {
      // Find playlists that already contain this track
      const currentPlaylists = playlists.filter(
        isTrackInPlaylist(track.id, playlistData)
      );

      const trackArtistIds = new Set(track.artistIds);

      // Find playlists that don't contain this track and calculate similarity
      const suggestedPlaylists = playlists
        .filter(isTrackNotInPlaylist(track.id, playlistData))
        .map((playlist) => {
          const data = playlistData[playlist.id];
          if (!data) {
            return null;
          }

          // Find matching genres (with counts from the playlist)
          const similarGenres = data.genres.filter((g) => {
            // Check if any of the track's artists have this genre
            return data.artists.some(
              (a) => trackArtistIds.has(a.id) && a.genres.includes(g.name)
            );
          });

          // Find matching artists (with track counts from the playlist)
          const similarArtists = data.artists
            .filter((a) => trackArtistIds.has(a.id))
            .map((artist) => {
              // Get tracks from this artist in this playlist
              const artistTracks = data.tracks
                .filter((t) => t.artistIds.includes(artist.id))
                .map((t) => ({ id: t.id, name: t.name }));

              return {
                ...artist,
                tracks: artistTracks,
              };
            });

          if (similarGenres.length === 0 && similarArtists.length === 0) {
            return null;
          }

          return {
            playlist,
            similarGenres,
            similarArtists,
          };
        })
        .filter(
          (suggestion): suggestion is NonNullable<typeof suggestion> =>
            suggestion !== null
        )
        .sort((a, b) => {
          // First sort by total track count of similar artists
          const aArtistTrackCount = a.similarArtists.reduce(
            (sum, artist) => sum + artist.trackCount,
            0
          );
          const bArtistTrackCount = b.similarArtists.reduce(
            (sum, artist) => sum + artist.trackCount,
            0
          );
          const artistTrackDiff = bArtistTrackCount - aArtistTrackCount;
          if (artistTrackDiff !== 0) return artistTrackDiff;

          // Then sort by genre count
          return b.similarGenres.length - a.similarGenres.length;
        });

      result.push({
        track,
        currentPlaylists,
        suggestedPlaylists,
      });
    }

    return result;
  }

  calculatePlaylistConsistency(
    artists: Artist[],
    sortedGenres: { name: string; count: number }[],
    totalTracksInPlaylist: number,
    tracks: Track[]
  ) {
    // Pick "main" genres by cumulative coverage for stability:
    // include at least 3, stop when we cover ~60% of tracks, cap at 10.
    const minGenres = 3;
    const maxGenres = 10;
    const targetCoverage = 0.6;

    const topGenres: string[] = [];
    let covered = 0;
    for (const g of sortedGenres) {
      if (topGenres.length >= maxGenres) break;
      topGenres.push(g.name);
      covered += g.count;
      if (
        topGenres.length >= minGenres &&
        covered / totalTracksInPlaylist >= targetCoverage
      ) {
        break;
      }
    }

    // Build genre frequency map for scoring
    const genreFrequency = new Map<string, number>();
    sortedGenres.forEach((g) => {
      genreFrequency.set(g.name, g.count / totalTracksInPlaylist);
    });

    // Precompute genre infos + a cache for pairwise similarity
    const genreInfoByName = new Map<string, GenreInfo>();
    const getInfoCached = (name: string) => {
      const existing = genreInfoByName.get(name);
      if (existing) return existing;
      const info = getGenreInfo(name);
      genreInfoByName.set(name, info);
      return info;
    };

    const similarityCache = new Map<string, number>();
    const getSimilarityCached = (a: string, b: string) => {
      // Stable key to avoid duplicating (a,b) vs (b,a)
      const key = a < b ? `${a}|||${b}` : `${b}|||${a}`;
      const existing = similarityCache.get(key);
      if (existing !== undefined) return existing;
      const sim = genreSimilarity(getInfoCached(a), getInfoCached(b));
      similarityCache.set(key, sim);
      return sim;
    };

    const playlistGenreNames = sortedGenres.map((g) => g.name);
    const topGenreSimilarityThreshold = 0.85;
    const bestSimilarGenreFrequency = (artistGenre: string) => {
      // Best-match frequency across all playlist genres, weighted by similarity.
      let best = 0;
      for (const pg of playlistGenreNames) {
        const base = genreFrequency.get(pg) ?? 0;
        if (base <= 0) continue;
        const sim = getSimilarityCached(artistGenre, pg);
        if (sim <= 0) continue;
        const candidate = base * sim;
        if (candidate > best) best = candidate;
      }
      return best;
    };

    // Analyze each artist for genre deviation
    const outliers: GenreOutlier[] = [];
    let totalDeviationScore = 0;

    artists.forEach((artist) => {
      if (artist.genres.length === 0 || artist.trackCount === 0) return;

      const commonGenres = artist.genres.filter((g) =>
        topGenres.some(
          (tg) => getSimilarityCached(g, tg) >= topGenreSimilarityThreshold
        )
      );
      const uniqueGenres = artist.genres.filter(
        (g) => !commonGenres.includes(g)
      );

      // Fit-based deviation:
      // - avgFreq: mean playlist frequency of the artist's genres
      // - maxFreq: best-matching genre to playlist
      // Higher fit => lower deviation.
      const freqs = artist.genres.map((g) => bestSimilarGenreFrequency(g));
      const avgFreq =
        freqs.length > 0 ? freqs.reduce((s, v) => s + v, 0) / freqs.length : 0;
      const maxFreq = freqs.length > 0 ? Math.max(...freqs) : 0;

      const fit = Math.max(
        0,
        Math.min(100, (0.55 * maxFreq + 0.45 * avgFreq) * 100)
      );
      const deviationScore = Math.round(Math.min(100, Math.max(0, 100 - fit)));
      totalDeviationScore += deviationScore * artist.trackCount;

      // Outliers: poor fit, with thresholds that still surface meaningful “odd ones out”.
      // (We still show the score for all outliers; UI can sort/limit as needed.)
      const isOutlier =
        deviationScore >= 80 ||
        (deviationScore >= 70 && artist.trackCount >= 3);
      if (isOutlier) {
        outliers.push({
          artist,
          trackCount: artist.trackCount,
          artistGenres: artist.genres,
          deviationScore,
          commonGenres,
          uniqueGenres,
        });
      }
    });

    outliers.sort((a, b) => b.deviationScore - a.deviationScore);

    const avgDeviation =
      artists.length > 0 ? totalDeviationScore / totalTracksInPlaylist : 0;

    // Calculate time analysis
    const timeAnalysis = this.calculateTimeAnalysis(tracks);

    const genreScore = Math.round(Math.max(0, 100 - avgDeviation));
    const timeScore =
      timeAnalysis?.iqrYears !== undefined
        ? Math.round(Math.max(0, 100 - timeAnalysis.iqrYears * 2))
        : undefined;

    const consistencyScore =
      timeScore !== undefined
        ? Math.round(0.75 * genreScore + 0.25 * timeScore)
        : genreScore;

    return {
      consistencyScore,
      genreScore,
      timeScore,
      outliers,
      mainGenres: topGenres,
      totalArtists: artists.length,
      timeAnalysis,
    };
  }

  private calculateTimeAnalysis(tracks: Track[]) {
    // Extract years from tracks
    const years: number[] = [];
    const trackYears: Map<string, number> = new Map();

    tracks.forEach((track) => {
      const releaseDate = track.album.releaseDate;
      if (releaseDate) {
        const year = parseInt(releaseDate.substring(0, 4), 10);
        if (!isNaN(year)) {
          years.push(year);
          trackYears.set(track.id, year);
        }
      }
    });

    if (years.length === 0) {
      return undefined;
    }

    // Calculate median year
    const sortedYears = [...years].sort((a, b) => a - b);
    const medianYear =
      sortedYears.length % 2 === 0
        ? Math.round(
            (sortedYears[sortedYears.length / 2 - 1] +
              sortedYears[sortedYears.length / 2]) /
              2
          )
        : sortedYears[Math.floor(sortedYears.length / 2)];

    // Calculate year range
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    // Quartiles and IQR (for robust outlier detection)
    const percentile = (p: number) => {
      const idx = (sortedYears.length - 1) * p;
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      if (lo === hi) return sortedYears[lo];
      const w = idx - lo;
      return Math.round(sortedYears[lo] * (1 - w) + sortedYears[hi] * w);
    };

    const q1Year = percentile(0.25);
    const q3Year = percentile(0.75);
    const iqrYears = q3Year - q1Year;
    const lowerBound = q1Year - Math.round(1.5 * iqrYears);
    const upperBound = q3Year + Math.round(1.5 * iqrYears);

    // Calculate decade distribution
    const decadeCounts = new Map<string, number>();
    years.forEach((year) => {
      const decade = `${Math.floor(year / 10) * 10}s`;
      decadeCounts.set(decade, (decadeCounts.get(decade) || 0) + 1);
    });

    const decadeDistribution: DecadeDistribution[] = Array.from(
      decadeCounts.entries()
    )
      .map(([decade, count]) => ({
        decade,
        count,
        percentage: Math.round((count / years.length) * 100),
      }))
      .sort((a, b) => {
        // Sort by decade chronologically
        return parseInt(a.decade) - parseInt(b.decade);
      });

    // Find time outliers based on decade distribution
    const timeOutliers: TimeOutlier[] = [];

    tracks.forEach((track) => {
      const year = trackYears.get(track.id);
      if (year !== undefined) {
        const deviationYears = Math.abs(year - medianYear);

        // Robust outlier: outside Tukey fences (Q1/Q3 ± 1.5*IQR)
        if (year < lowerBound || year > upperBound) {
          timeOutliers.push({
            track,
            releaseYear: year,
            deviationYears,
          });
        }
      }
    });

    // Sort outliers by deviation from median (most deviant first)
    timeOutliers.sort((a, b) => b.deviationYears - a.deviationYears);

    return {
      medianYear,
      q1Year,
      q3Year,
      iqrYears,
      outlierBounds: { lower: lowerBound, upper: upperBound },
      yearRange: { min: minYear, max: maxYear },
      decadeDistribution,
      timeOutliers: timeOutliers.slice(0, 10), // Limit to top 10 outliers
    };
  }
}
