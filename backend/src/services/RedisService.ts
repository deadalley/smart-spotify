import {
  Artist,
  convertFromRedisArtist,
  convertFromRedisPlaylist,
  convertFromRedisTrack,
  convertFromRedisUser,
  convertSpotifyArtistToRedis,
  convertSpotifyPlaylistToRedis,
  convertSpotifyTrackToRedis,
  convertSpotifyUserToRedis,
  Playlist,
  PlaylistData,
  SpotifyArtist,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyUser,
  Track,
  User,
} from "@smart-spotify/shared";
import { redisClient } from "../redis";

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

  private getMetaKey(userId: string) {
    return this.getRedisKey(userId, "meta");
  }

  // Uses Redis SCAN (incremental) instead of KEYS (blocking).
  // KEYS can stall Redis on large datasets; SCAN keeps Redis responsive as data grows.
  private async scanKeys(match: string): Promise<string[]> {
    const keys: string[] = [];
    for await (const key of redisClient.scanIterator({ MATCH: match })) {
      keys.push(key);
    }
    return keys;
  }

  async setSyncMeta({
    userId,
    lastSync,
    playlistCount,
    trackCount,
    artistCount,
  }: {
    userId: string;
    lastSync: string;
    playlistCount: number;
    trackCount: number;
    artistCount: number;
  }): Promise<void> {
    await redisClient.hSet(this.getMetaKey(userId), {
      lastSync,
      playlistCount: String(playlistCount),
      trackCount: String(trackCount),
      artistCount: String(artistCount),
    });
  }

  async getSyncMeta(userId: string): Promise<
    | {
        lastSync: string;
        playlistCount: number;
        trackCount: number;
        artistCount: number;
      }
    | null
  > {
    const data = await redisClient.hGetAll(this.getMetaKey(userId));
    if (Object.keys(data).length === 0) return null;

    return {
      lastSync: data.lastSync || "",
      playlistCount: Number(data.playlistCount || 0),
      trackCount: Number(data.trackCount || 0),
      artistCount: Number(data.artistCount || 0),
    };
  }

  // User operations
  async storeUser(user: SpotifyUser): Promise<void> {
    const userKey = this.getRedisKey(user.id, "user");
    const userData = convertSpotifyUserToRedis(user);

    await redisClient.hSet(userKey, userData);
  }

  async getUser(userId: string): Promise<User | null> {
    const userKey = this.getRedisKey(userId, "user");
    const userData = await redisClient.hGetAll(userKey);

    if (Object.keys(userData).length === 0) {
      return null;
    }

    return convertFromRedisUser(userData);
  }

  // Playlist operations
  async storePlaylists(
    userId: string,
    playlists: SpotifyPlaylist[]
  ): Promise<void> {
    if (playlists.length === 0) return;

    // Pipeline writes to reduce round trips.
    const pipeline = redisClient.multi();
    for (const playlist of playlists) {
      const playlistKey = this.getRedisKey(userId, "playlist", playlist.id);
      const playlistData = convertSpotifyPlaylistToRedis(playlist);
      pipeline.hSet(playlistKey, playlistData);
    }

    await pipeline.exec();
  }

  async getUserPlaylists(userId: string): Promise<Playlist[]> {
    const playlistKeys = await this.scanKeys(
      this.getRedisKey(userId, "playlist", "*")
    );
    const playlists: Playlist[] = [];

    // Filter keys to only include direct playlist hash keys (not relationship sets)
    const directplaylistKeys = playlistKeys.filter((key) => {
      const parts = key.split(":");
      // playlist hash keys have exactly 4 parts: smart-spotify:userId:playlist:playlistId
      // Relationship keys have 5+ parts: smart-spotify:userId:playlist:playlistId:tracks
      return parts.length === 4;
    });

    for (const playlistKey of directplaylistKeys) {
      try {
        const playlistData = await redisClient.hGetAll(playlistKey);
        if (Object.keys(playlistData).length > 0) {
          const playlist = convertFromRedisPlaylist(playlistData);

          const trackIds = await redisClient.zRange(
            this.getRedisKey(userId, "playlist", playlist.id, "tracks"),
            0,
            -1
          );

          playlists.push({ ...playlist, trackCount: trackIds.length });
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

    const trackIds = await redisClient.zRange(
      this.getRedisKey(userId, "playlist", playlistId, "tracks"),
      0,
      -1
    );

    return {
      ...convertFromRedisPlaylist(playlistData),
      trackCount: trackIds.length,
    };
  }

  async updatePlaylistType(
    userId: string,
    playlistId: string,
    playlistType: string
  ): Promise<void> {
    const playlistKey = this.getRedisKey(userId, "playlist", playlistId);
    await redisClient.hSet(playlistKey, { playlistType });
  }

  // Track operations
  async storeTracks(
    userId: string,
    playlistId: string,
    tracks: SpotifyTrack[]
  ): Promise<void> {
    if (tracks.length === 0) return;

    const tracksKey = this.getRedisKey(
      userId,
      "playlist",
      playlistId,
      "tracks"
    );

    // Clear existing sorted set once (maintains order via score).
    await redisClient.del(tracksKey);

    // Chunk pipelines to avoid enormous MULTI payloads for big playlists.
    const chunkSize = 200;

    for (let offset = 0; offset < tracks.length; offset += chunkSize) {
      const chunk = tracks.slice(offset, offset + chunkSize);
      const pipeline = redisClient.multi();
      const sortedSetData: { score: number; value: string }[] = [];

      for (let i = 0; i < chunk.length; i++) {
        const globalIndex = offset + i;
        const track = chunk[i];
        const playlistPosition = globalIndex; // 0-based position in playlist

        const trackKey = this.getRedisKey(userId, "track", track.id);
        const trackData = convertSpotifyTrackToRedis(track, playlistPosition);

        // Track metadata
        pipeline.hSet(trackKey, trackData);

        // Track-playlist relationship
        pipeline.sAdd(
          this.getRedisKey(userId, "track", track.id, "playlists"),
          playlistId
        );

        // Track ordering
        sortedSetData.push({ score: playlistPosition, value: track.id });

        // Artist relationships
        for (const artist of track.artists) {
          const artistId = artist.id;

          pipeline.sAdd(
            this.getRedisKey(userId, "artist", artistId, "tracks"),
            track.id
          );

          pipeline.sAdd(
            this.getRedisKey(userId, "artist", artistId, "playlists"),
            playlistId
          );

          pipeline.sAdd(
            this.getRedisKey(userId, "track", track.id, "artists"),
            artistId
          );
        }
      }

      if (sortedSetData.length > 0) {
        pipeline.zAdd(tracksKey, sortedSetData);
      }

      await pipeline.exec();
    }
  }

  async getUserTracks(userId: string): Promise<Track[]> {
    const trackKeys = await this.scanKeys(
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
          const track = convertFromRedisTrack(trackData);

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
    const tracksKey = this.getRedisKey(
      userId,
      "playlist",
      playlistId,
      "tracks"
    );
    const trackIds = await redisClient.zRange(tracksKey, 0, -1);

    const tracks: Track[] = [];

    for (let i = 0; i < trackIds.length; i++) {
      const trackId = trackIds[i];
      const trackData = await redisClient.hGetAll(
        this.getRedisKey(userId, "track", trackId)
      );

      if (Object.keys(trackData).length > 0) {
        const track = convertFromRedisTrack(trackData);
        // Set position from the sorted set order
        track.playlistPosition = i;
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
        const track = convertFromRedisTrack(trackData);

        tracks.push(track);
      }
    }

    return tracks;
  }

  // Artist operations
  async storeArtists(userId: string, artists: SpotifyArtist[]): Promise<void> {
    if (artists.length === 0) return;

    // Pipeline writes to reduce round trips.
    const pipeline = redisClient.multi();
    for (const artist of artists) {
      const artistKey = this.getRedisKey(userId, "artist", artist.id);
      const artistData = convertSpotifyArtistToRedis(artist);
      pipeline.hSet(artistKey, artistData);
    }
    await pipeline.exec();
  }

  async getUserArtists(userId: string): Promise<Artist[]> {
    const artistKeys = await this.scanKeys(
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
          const artist = convertFromRedisArtist(artistData);

          const trackIds = await redisClient.sMembers(
            this.getRedisKey(userId, "artist", artist.id, "tracks")
          );

          artists.push({
            ...convertFromRedisArtist(artistData),
            trackCount: trackIds.length,
          });
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

  async getArtistsByIds(
    userId: string,
    artistIds: string[]
  ): Promise<Artist[]> {
    if (artistIds.length === 0) return [];

    const pipeline = redisClient.multi();

    const artistKeys = artistIds.map((id) =>
      this.getRedisKey(userId, "artist", id)
    );
    artistKeys.forEach((key) => pipeline.hGetAll(key));

    const trackKeys = artistIds.map((id) =>
      this.getRedisKey(userId, "artist", id, "tracks")
    );
    trackKeys.forEach((key) => pipeline.sCard(key));

    const results = await pipeline.exec();

    if (!results) return [];

    const artistDataResults = results.slice(0, artistIds.length);
    const trackCountResults = results.slice(artistIds.length);

    return artistDataResults
      .map((artistData, index) => {
        if (!artistData) {
          return null;
        }

        const trackCount = trackCountResults[index];

        return {
          ...convertFromRedisArtist(
            artistData as unknown as Record<string, string>
          ),
          trackCount,
        };
      })
      .filter((data): data is Artist => !!data);
  }

  async getArtist(userId: string, artistId: string): Promise<Artist | null> {
    const artistKey = this.getRedisKey(userId, "artist", artistId);
    const artistData = await redisClient.hGetAll(artistKey);

    if (Object.keys(artistData).length === 0) {
      return null;
    }

    const trackIds = await redisClient.sMembers(
      this.getRedisKey(userId, "artist", artistId, "tracks")
    );

    return {
      ...convertFromRedisArtist(artistData),
      trackCount: trackIds.length,
    };
  }

  async getPlaylistData(
    userId: string,
    playlistId: string
  ): Promise<PlaylistData | null> {
    // Fetch playlist and track IDs
    const [playlistData, trackIds] = await Promise.all([
      redisClient.hGetAll(this.getRedisKey(userId, "playlist", playlistId)),
      redisClient.zRange(
        this.getRedisKey(userId, "playlist", playlistId, "tracks"),
        0,
        -1
      ),
    ]);

    if (Object.keys(playlistData).length === 0) {
      return null;
    }

    const playlist = convertFromRedisPlaylist(playlistData);

    if (trackIds.length === 0) {
      return {
        playlist,
        tracks: [],
        artists: [],
        genres: [],
        totalDurationMs: 0,
      };
    }

    // Fetch all track data and artist IDs
    const trackPipeline = redisClient.multi();
    trackIds.forEach((id) => {
      trackPipeline.hGetAll(this.getRedisKey(userId, "track", id));
      trackPipeline.sMembers(this.getRedisKey(userId, "track", id, "artists"));
    });

    const results = await trackPipeline.exec();
    if (!results) {
      return {
        playlist,
        tracks: [],
        artists: [],
        genres: [],
        totalDurationMs: 0,
      };
    }

    // Process tracks and collect stats
    const tracks: Track[] = [];
    const artistTrackCount = new Map<string, number>();
    let totalDurationMs = 0;

    trackIds.forEach((_, index) => {
      const trackData = results[index * 2] as unknown as Record<string, string>;
      const artistIds = results[index * 2 + 1] as string[];

      if (trackData) {
        const track = convertFromRedisTrack(trackData);
        track.playlistPosition = index;
        tracks.push(track);
        totalDurationMs += track.durationMs;

        artistIds.forEach((artistId) => {
          artistTrackCount.set(
            artistId,
            (artistTrackCount.get(artistId) || 0) + 1
          );
        });
      }
    });

    // Fetch artist data
    const uniqueArtistIds = Array.from(artistTrackCount.keys());
    const artistPipeline = redisClient.multi();
    uniqueArtistIds.forEach((artistId) => {
      artistPipeline.hGetAll(this.getRedisKey(userId, "artist", artistId));
    });
    const artistResults = await artistPipeline.exec();

    const artists: Artist[] = [];
    const artistGenres = new Map<string, Set<string>>();

    if (artistResults) {
      artistResults.forEach((artistData, index) => {
        const data = artistData as unknown as Record<string, string>;

        if (data) {
          const artist = convertFromRedisArtist(data);
          const trackCount = artistTrackCount.get(uniqueArtistIds[index]) || 0;
          artists.push({ ...artist, trackCount });

          // Store artist genres for later use
          artistGenres.set(artist.id, new Set(artist.genres));
        }
      });
    }

    // Count genres by track (not by artist track count)
    const genreCount = new Map<string, number>();
    tracks.forEach((track) => {
      const trackGenres = new Set<string>();
      // Collect all unique genres from all artists on this track
      track.artistIds.forEach((artistId) => {
        const genres = artistGenres.get(artistId);
        if (genres) {
          genres.forEach((genre) => trackGenres.add(genre));
        }
      });
      // Increment count for each unique genre on this track
      trackGenres.forEach((genre) => {
        genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
      });
    });

    const genres = Array.from(genreCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    artists.sort((a, b) => b.trackCount - a.trackCount);

    return {
      playlist,
      tracks,
      artists,
      genres,
      totalDurationMs,
    };
  }

  // Add track to playlist
  async addTrackToPlaylist(
    userId: string,
    playlistId: string,
    track: SpotifyTrack
  ): Promise<void> {
    const trackKey = this.getRedisKey(userId, "track", track.id);

    // Get the current highest position in the playlist
    const tracksKey = this.getRedisKey(
      userId,
      "playlist",
      playlistId,
      "tracks"
    );
    // Get the count of tracks in the playlist to determine next position
    const currentTrackCount = await redisClient.zCard(tracksKey);
    const nextPosition = currentTrackCount;

    // Store track metadata if it doesn't exist
    const trackData = convertSpotifyTrackToRedis(track, nextPosition);
    await redisClient.hSet(trackKey, trackData);

    // Store track-playlist relationship
    await redisClient.sAdd(
      this.getRedisKey(userId, "track", track.id, "playlists"),
      playlistId
    );

    // Add to playlist's sorted set
    await redisClient.zAdd(tracksKey, { score: nextPosition, value: track.id });

    // Store artist relationships
    for (const artist of track.artists) {
      // Store artist-track relationship
      await redisClient.sAdd(
        this.getRedisKey(userId, "artist", artist.id, "tracks"),
        track.id
      );

      // Store artist-playlist relationship
      await redisClient.sAdd(
        this.getRedisKey(userId, "artist", artist.id, "playlists"),
        playlistId
      );

      // Store track-artist relationship
      await redisClient.sAdd(
        this.getRedisKey(userId, "track", track.id, "artists"),
        artist.id
      );
    }

    // Update playlist track count
    const playlistKey = this.getRedisKey(userId, "playlist", playlistId);
    const trackCount = await redisClient.zCard(tracksKey);
    await redisClient.hSet(playlistKey, { tracks: trackCount.toString() });
  }

  // Remove track from playlist
  async removeTrackFromPlaylist(
    userId: string,
    playlistId: string,
    trackId: string
  ): Promise<void> {
    const tracksKey = this.getRedisKey(
      userId,
      "playlist",
      playlistId,
      "tracks"
    );

    // Remove from playlist's sorted set
    await redisClient.zRem(tracksKey, trackId);

    // Remove track-playlist relationship
    await redisClient.sRem(
      this.getRedisKey(userId, "track", trackId, "playlists"),
      playlistId
    );

    // Get track artists to update their relationships
    const artistIds = await redisClient.sMembers(
      this.getRedisKey(userId, "track", trackId, "artists")
    );

    // Check if track still exists in other playlists
    const remainingPlaylists = await redisClient.sMembers(
      this.getRedisKey(userId, "track", trackId, "playlists")
    );

    // If track is not in any other playlist, remove it completely
    if (remainingPlaylists.length === 0) {
      // Remove track hash
      await redisClient.del(this.getRedisKey(userId, "track", trackId));

      // Remove track-artist relationships
      await redisClient.del(
        this.getRedisKey(userId, "track", trackId, "artists")
      );

      // Remove artist-track relationships
      for (const artistId of artistIds) {
        await redisClient.sRem(
          this.getRedisKey(userId, "artist", artistId, "tracks"),
          trackId
        );
      }
    }

    // Update artist-playlist relationships
    for (const artistId of artistIds) {
      // Check if artist still has tracks in this playlist
      const artistTracks = await redisClient.sMembers(
        this.getRedisKey(userId, "artist", artistId, "tracks")
      );
      const playlistTracks = await redisClient.zRange(tracksKey, 0, -1);

      const hasTracksInPlaylist = artistTracks.some((t) =>
        playlistTracks.includes(t)
      );

      // If no more tracks from this artist in the playlist, remove the relationship
      if (!hasTracksInPlaylist) {
        await redisClient.sRem(
          this.getRedisKey(userId, "artist", artistId, "playlists"),
          playlistId
        );
      }
    }

    // Update playlist track count
    const playlistKey = this.getRedisKey(userId, "playlist", playlistId);
    const trackCount = await redisClient.zCard(tracksKey);
    await redisClient.hSet(playlistKey, { tracks: trackCount.toString() });
  }

  // Helper method to delete all user data
  async deleteUserData(userId: string): Promise<void> {
    const allKeys = await this.scanKeys(this.getRedisKey(userId, "*"));

    if (allKeys.length > 0) {
      await redisClient.del(allKeys);
    }
  }
}
