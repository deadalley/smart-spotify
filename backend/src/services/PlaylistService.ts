import { Playlist, TrackAggregationResult } from "@smart-spotify/shared";
import { getGenres } from "../utils";
import { RedisService } from "./RedisService";

export class PlaylistService {
  constructor(private redisService: RedisService) {}

  async aggregatePlaylists(userId: string): Promise<Playlist[]> {
    const playlists = await this.redisService.getUserPlaylists(userId);
    // Placeholder for playlist aggregation logic
    return playlists;
  }

  async aggregateLikedSongs(userId: string): Promise<TrackAggregationResult[]> {
    const playlistGenreMap: Record<string, string[]> = {};
    const playlistArtistMap: Record<string, string[]> = {};
    const playlistTrackMap: Record<string, string[]> = {};

    const playlists = await this.redisService.getUserPlaylists(userId);

    for (const playlist of playlists) {
      if (playlist.id === "liked-songs") {
        break;
      }

      const { artists, genres, tracks } =
        await this.redisService.getPlaylistData(userId, playlist.id);

      playlistGenreMap[playlist.id] = genres
        .sort((a, b) => b.count - a.count)
        .map((g) => g.name);
      playlistArtistMap[playlist.id] = artists
        .sort((a, b) => b.trackCount - a.trackCount)
        .map((a) => a.artist.name);
      playlistTrackMap[playlist.id] = tracks.map((t) => t.id);
    }

    const likedTracks = await this.redisService.getPlaylistTracks(
      userId,
      "liked-songs"
    );

    const result = [];

    for (const track of likedTracks) {
      const artists = await this.redisService.getArtistsByIds(
        userId,
        track.artistIds
      );

      const genres = getGenres(artists);

      const currentPlaylists = playlists.filter(
        (p) =>
          p.id !== "liked-songs" &&
          (playlistTrackMap[p.id] || []).includes(track.id)
      );

      const suggestedPlaylists = playlists
        .filter(
          (p) =>
            p.id !== "liked-songs" &&
            !(playlistTrackMap[p.id] || []).includes(track.id)
        )
        .map((playlist) => {
          const similarGenres = genres
            .map((g) => g.name)
            .filter((g) => (playlistGenreMap[playlist.id] || []).includes(g));

          const similarArtists = artists.filter((artist) =>
            (playlistArtistMap[playlist.id] || []).includes(artist.name)
          );

          return {
            playlist,
            similarGenres,
            similarArtists,
          };
        })
        .filter(
          (suggestion) =>
            suggestion.similarGenres.length > 0 ||
            suggestion.similarArtists.length > 0
        )
        .sort((a, b) => {
          const genreDiff = b.similarGenres.length - a.similarGenres.length;
          if (genreDiff !== 0) return genreDiff;
          return b.similarArtists.length - a.similarArtists.length;
        });

      result.push({
        track,
        currentPlaylists,
        suggestedPlaylists,
      });
    }
    return result;
  }
}
