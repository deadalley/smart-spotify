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

    return {
      playlistId: playlistId,
      tracks,
      artists,
      totalDurationMs: duration,
    };
  }

  async aggregatePlaylists(userId: string): Promise<Playlist[]> {
    const playlists = await this.redisService.getUserPlaylists(userId);
    // Placeholder for playlist aggregation logic
    return playlists;
  }
}
