import { Playlist, PlaylistAnalysis } from "@smart-spotify/shared";
import { RedisService } from "./RedisService";

export class PlaylistService {
  constructor(private redisService: RedisService) {}

  async analyzePlaylist(
    userId: string,
    playlistId: string
  ): Promise<PlaylistAnalysis> {
    const { tracks, artists } = await this.redisService.getPlaylistData(
      userId,
      playlistId
    );

    const duration = tracks.reduce((acc, track) => acc + track.durationMs, 0);

    const genres = Object.entries(
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

    return {
      playlistId: playlistId,
      tracks,
      artists,
      genres,
      totalDurationMs: duration,
    };
  }

  async aggregatePlaylists(userId: string): Promise<Playlist[]> {
    const playlists = await this.redisService.getUserPlaylists(userId);
    // Placeholder for playlist aggregation logic
    return playlists;
  }
}
