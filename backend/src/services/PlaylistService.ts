import {
  Playlist,
  PlaylistData,
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
              (a) =>
                trackArtistIds.has(a.artist.id) &&
                a.artist.genres.includes(g.name)
            );
          });

          // Find matching artists (with track counts from the playlist)
          const similarArtists = data.artists.filter((a) =>
            trackArtistIds.has(a.artist.id)
          );

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
          (
            suggestion
          ): suggestion is TrackAggregationResult["suggestedPlaylists"][number] =>
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
}
