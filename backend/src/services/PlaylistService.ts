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
    // Identify main genres: genres that appear in at least 10% of tracks
    // or at minimum the top 3 genres (to handle small playlists)
    const minAbsoluteCount = Math.max(
      Math.ceil(totalTracksInPlaylist * 0.1),
      1
    );
    const minTopGenres = 3; // Always include at least top 3 genres

    const topGenres: string[] = [];

    for (const genre of sortedGenres) {
      // Stop if we have enough genres and this genre is below threshold
      if (topGenres.length >= minTopGenres && genre.count < minAbsoluteCount) {
        break;
      }

      topGenres.push(genre.name);
    }

    // Build genre frequency map for scoring
    const genreFrequency = new Map<string, number>();
    sortedGenres.forEach((g) => {
      genreFrequency.set(g.name, g.count / totalTracksInPlaylist);
    });

    // Analyze each artist for genre deviation
    const outliers: GenreOutlier[] = [];
    let totalDeviationScore = 0;

    artists.forEach((artist) => {
      if (artist.genres.length === 0 || artist.trackCount === 0) return;

      const commonGenres = artist.genres.filter((g) => topGenres.includes(g));
      const uniqueGenres = artist.genres.filter((g) => !topGenres.includes(g));

      // Calculate deviation score (0-100)
      // Higher score = more deviation from playlist's main genres
      let deviationScore = 0;

      // Factor 1: Percentage of artist's genres that are NOT in main genres
      const uniqueGenreRatio = uniqueGenres.length / artist.genres.length;
      deviationScore += uniqueGenreRatio * 50;

      // Factor 2: How common are the artist's unique genres in the playlist
      const avgUniqueGenreFreq =
        uniqueGenres.length > 0
          ? uniqueGenres.reduce(
              (sum, g) => sum + (genreFrequency.get(g) || 0),
              0
            ) / uniqueGenres.length
          : 0;
      deviationScore += (1 - avgUniqueGenreFreq) * 30;

      // Factor 3: Weight by track count (artists with more tracks should have lower deviation)
      const trackRatio = artist.trackCount / totalTracksInPlaylist;
      deviationScore += (1 - Math.min(trackRatio * 10, 1)) * 20;

      deviationScore = Math.min(100, Math.max(0, deviationScore));
      totalDeviationScore += deviationScore * artist.trackCount;

      // Only include as outlier if deviation is significant (> 70)
      if (deviationScore > 70) {
        outliers.push({
          artist,
          trackCount: artist.trackCount,
          artistGenres: artist.genres,
          deviationScore: Math.round(deviationScore),
          commonGenres,
          uniqueGenres,
        });
      }
    });

    outliers.sort((a, b) => b.deviationScore - a.deviationScore);

    const avgDeviation =
      artists.length > 0 ? totalDeviationScore / totalTracksInPlaylist : 0;

    const consistencyScore = Math.round(Math.max(0, 100 - avgDeviation));

    // Calculate time analysis
    const timeAnalysis = this.calculateTimeAnalysis(tracks);

    return {
      consistencyScore,
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
    // Tracks from decades with < 10% representation are considered outliers
    const timeOutliers: TimeOutlier[] = [];
    const decadeThreshold = 10; // Decades with < 10% representation are outliers

    // Create a set of decades that are underrepresented
    const outlierDecades = new Set(
      decadeDistribution
        .filter((d) => d.percentage < decadeThreshold)
        .map((d) => d.decade)
    );

    tracks.forEach((track) => {
      const year = trackYears.get(track.id);
      if (year !== undefined) {
        const decade = `${Math.floor(year / 10) * 10}s`;
        const deviationYears = Math.abs(year - medianYear);

        // Consider as outlier if from an underrepresented decade
        if (outlierDecades.has(decade)) {
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
      yearRange: { min: minYear, max: maxYear },
      decadeDistribution,
      timeOutliers: timeOutliers.slice(0, 10), // Limit to top 10 outliers
    };
  }
}
