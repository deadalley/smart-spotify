import { redisClient } from "../redis";
import { Artist, Playlist, Track, User } from "../types";
import { ParserService } from "./ParserService";

export class RedisService {
  // Generic function to generate Redis keys
  private getRedisKey(
    userId: string,
    type: string,
    ...keys: (string | undefined)[]
  ): string {
    const namespace = `smart-spotify:${userId}`;

    if (keys?.length) {
      return `${namespace}:${type}:${keys.join(":")}`;
    }

    return `${namespace}:${type}`;
  }

  // User operations
  async storeUser(user: User): Promise<void> {
    const userKey = this.getRedisKey(user.id, "user");
    const userData = ParserService.convertToRedisUser(user);

    await redisClient.hSet(userKey, userData);
  }

  async getUser(userId: string): Promise<User | null> {
    const userKey = this.getRedisKey(userId, "user");
    const userData = await redisClient.hGetAll(userKey);

    if (Object.keys(userData).length === 0) {
      return null;
    }

    return ParserService.convertFromRedisUser(userData);
  }

  // Playlist operations
  async storePlaylists(userId: string, playlists: Playlist[]): Promise<void> {
    for (const playlist of playlists) {
      const playlistKey = this.getRedisKey(userId, "playlist", playlist.id);
      const playlistData = ParserService.convertToRedisPlaylist(playlist);

      await redisClient.hSet(playlistKey, playlistData);
    }
  }

  async getUserPlaylists(userId: string): Promise<Playlist[]> {
    const playlistKeys = await redisClient.keys(
      this.getRedisKey(userId, "playlist", "*")
    );
    const playlists: Playlist[] = [];

    // Filter keys to only include direct playlist hash keys (not relationship sets)
    const directplaylistKeys = playlistKeys.filter((key) => {
      const parts = key.split(":");
      // playlist hash keys have exactly 4 parts: smart-spotify:userId:playlist:playlistId
      // Relationship keys have 5+ parts: smart-spotify:userId:playlist:playlistId:tracks/playlists
      return parts.length === 4;
    });

    for (const playlistKey of directplaylistKeys) {
      try {
        const playlistData = await redisClient.hGetAll(playlistKey);
        if (Object.keys(playlistData).length > 0) {
          const playlist = ParserService.convertFromRedisPlaylist(playlistData);

          playlists.push(playlist);
        }
      } catch (error) {
        console.error(
          `Error fetching playlist data for key ${playlistKey}:`,
          error
        );
      }
    }

    return playlists;
  }

  async getPlaylist(
    userId: string,
    playlistId: string
  ): Promise<Playlist | null> {
    const playlistKey = this.getRedisKey(userId, "playlist", playlistId);
    const playlistData = await redisClient.hGetAll(playlistKey);

    if (Object.keys(playlistData).length === 0) {
      return null;
    }

    return ParserService.convertFromRedisPlaylist(playlistData);
  }

  // Track operations
  async storeTracks(
    userId: string,
    playlistId: string,
    tracks: Track[]
  ): Promise<void> {
    const trackIds: string[] = [];

    for (const track of tracks) {
      const trackKey = this.getRedisKey(userId, "track", track.id);
      const trackData = ParserService.convertToRedisTrack(track);

      // Store track metadata
      await redisClient.hSet(trackKey, trackData);

      trackIds.push(track.id);

      // Store track-playlist relationship
      await redisClient.sAdd(
        this.getRedisKey(userId, "track", track.id, "playlists"),
        playlistId
      );

      // Store artist relationships
      for (let i = 0; i < track.artistIds.length; i++) {
        const artistId = track.artistIds[i];

        // Store artist-track relationship
        await redisClient.sAdd(
          this.getRedisKey(userId, "artist", artistId, "tracks"),
          track.id
        );

        // Store artist-playlist relationship
        await redisClient.sAdd(
          this.getRedisKey(userId, "artist", artistId, "playlists"),
          playlistId
        );

        // Store track-artist relationship
        await redisClient.sAdd(
          this.getRedisKey(userId, "track", track.id, "artists"),
          artistId
        );
      }
    }

    // Store playlist tracks as an ordered list
    if (trackIds.length > 0) {
      await redisClient.del(
        this.getRedisKey(userId, "playlist", playlistId, "tracks")
      );
      await redisClient.lPush(
        this.getRedisKey(userId, "playlist", playlistId, "tracks"),
        trackIds.reverse()
      );
    }
  }

  async getUserTracks(userId: string): Promise<Track[]> {
    const trackKeys = await redisClient.keys(
      this.getRedisKey(userId, "track", "*")
    );
    const tracks: Track[] = [];

    // Filter keys to only include direct track hash keys (not relationship sets)
    const directTrackKeys = trackKeys.filter((key) => {
      const parts = key.split(":");
      // Track hash keys have exactly 4 parts: smart-spotify:userId:track:trackId
      // Relationship keys have 5+ parts: smart-spotify:userId:track:trackId:playlists/artists
      return parts.length === 4;
    });

    for (const trackKey of directTrackKeys) {
      try {
        const trackData = await redisClient.hGetAll(trackKey);

        if (Object.keys(trackData).length > 0) {
          const track = ParserService.convertFromRedisTrack(trackData);

          tracks.push(track);
        }
      } catch (error) {
        console.error(`Error fetching track data for key ${trackKey}:`, error);
      }
    }

    return tracks.sort((a, b) => b.name.localeCompare(a.name));
  }

  async getPlaylistTracks(
    userId: string,
    playlistId: string
  ): Promise<Track[]> {
    const trackIds = await redisClient.lRange(
      this.getRedisKey(userId, "playlist", playlistId, "tracks"),
      0,
      -1
    );
    const tracks: Track[] = [];

    for (const trackId of trackIds) {
      const trackData = await redisClient.hGetAll(
        this.getRedisKey(userId, "track", trackId)
      );

      if (Object.keys(trackData).length > 0) {
        const track = ParserService.convertFromRedisTrack(trackData);

        tracks.push(track);
      }
    }

    return tracks;
  }

  async getArtistTracks(userId: string, artistId: string): Promise<Track[]> {
    const trackIds = await redisClient.sMembers(
      this.getRedisKey(userId, "artist", artistId, "tracks")
    );
    const tracks: Track[] = [];

    for (const trackId of trackIds) {
      const trackData = await redisClient.hGetAll(
        this.getRedisKey(userId, "track", trackId)
      );
      if (Object.keys(trackData).length > 0) {
        const track = ParserService.convertFromRedisTrack(trackData);

        tracks.push(track);
      }
    }

    return tracks;
  }

  // Artist operations
  async storeArtists(userId: string, artists: Artist[]): Promise<void> {
    for (const artist of artists) {
      const artistKey = this.getRedisKey(userId, "artist", artist.id);
      const artistData = ParserService.convertToRedisArtist(artist);

      await redisClient.hSet(artistKey, artistData);
    }
  }

  async getUserArtists(userId: string): Promise<Artist[]> {
    const artistKeys = await redisClient.keys(
      this.getRedisKey(userId, "artist", "*")
    );
    const artists: Artist[] = [];

    // Filter keys to only include direct artist hash keys (not relationship sets)
    const directArtistKeys = artistKeys.filter((key) => {
      const parts = key.split(":");
      // Artist hash keys have exactly 4 parts: smart-spotify:userId:artist:artistId
      // Relationship keys have 5+ parts: smart-spotify:userId:artist:artistId:tracks/playlists
      return parts.length === 4;
    });

    for (const artistKey of directArtistKeys) {
      try {
        const artistData = await redisClient.hGetAll(artistKey);
        if (Object.keys(artistData).length > 0) {
          const artist = ParserService.convertFromRedisArtist(artistData);

          artists.push(artist);
        }
      } catch (error) {
        console.error(
          `Error fetching artist data for key ${artistKey}:`,
          error
        );
      }
    }

    return artists;
  }

  async getArtist(userId: string, artistId: string): Promise<Artist | null> {
    const artistKey = this.getRedisKey(userId, "artist", artistId);
    const artistData = await redisClient.hGetAll(artistKey);

    if (Object.keys(artistData).length === 0) {
      return null;
    }

    return ParserService.convertFromRedisArtist(artistData);
  }

  // Helper method to delete all user data
  async deleteUserData(userId: string): Promise<void> {
    const allKeys = await redisClient.keys(this.getRedisKey(userId, "*"));

    if (allKeys.length > 0) {
      await redisClient.del(allKeys);
    }
  }
}
