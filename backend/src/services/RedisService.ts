import {
  Album,
  Artist,
  convertToRedisArtist,
  convertToRedisAlbum,
  convertToRedisPlaylist,
  convertToRedisTrack,
  convertToRedisUser,
  convertFromRedisAlbum,
  convertFromRedisArtist,
  convertFromRedisPlaylist,
  convertFromRedisTrack,
  convertFromRedisUser,
  convertSpotifyAlbumToRedis,
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

export type MusicSource = "spotify" | "yt-music";

// Synced library data is fully rebuilt on every resync, so it's safe to let
// it expire after a period of inactivity instead of keeping it forever.
const LIBRARY_TTL_SECONDS = 30 * 24 * 60 * 60;

export class RedisService {
  constructor(private source: MusicSource = "spotify") {}

  // Generic function to generate Redis keys
  private getRedisKey(
    userId: string,
    type: string,
    ...keys: (string | undefined)[]
  ): string {
    const namespace = `smart-spotify:${userId}:${this.source}`;

    if (keys?.length) {
      return `${namespace}:${type}:${keys.join(":")}`;
    }

    return `${namespace}:${type}`;
  }

  private getMetaKey(userId: string) {
    return this.getRedisKey(userId, "meta");
  }

  private getLastSyncedAtKey(userId: string) {
    return this.getRedisKey(userId, "lastSyncedAt");
  }

  // Explicit indexes of known IDs (rather than discovering them via SCAN +
  // glob match) so enumeration can't silently miss entries. SCAN only
  // guarantees it will surface every key that existed for the whole scan,
  // and that guarantee has known rough edges on non-reference Redis
  // implementations (e.g. Upstash's) at scale.
  private getPlaylistIndexKey(userId: string) {
    return this.getRedisKey(userId, "playlists-index");
  }

  private getArtistIndexKey(userId: string) {
    return this.getRedisKey(userId, "artists-index");
  }

  private getTrackIndexKey(userId: string) {
    return this.getRedisKey(userId, "tracks-index");
  }

  // Uses Redis SCAN (incremental) instead of KEYS (blocking).
  // KEYS can stall Redis on large datasets; SCAN keeps Redis responsive as data grows.
  // Only used for bulk namespace cleanup (deleteUserData*) where missing an
  // occasional key just means slightly stale leftovers, not missing data.
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
    const metaKey = this.getMetaKey(userId);
    await redisClient.hSet(metaKey, {
      lastSync,
      playlistCount: String(playlistCount),
      trackCount: String(trackCount),
      artistCount: String(artistCount),
    });
    await redisClient.expire(metaKey, LIBRARY_TTL_SECONDS);

    // Kept without a TTL so we can tell "never synced" apart from "synced,
    // but the cached data has since expired" after the rest of a user's
    // data is gone.
    await redisClient.set(this.getLastSyncedAtKey(userId), lastSync);
  }

  async getLastSyncedAt(userId: string): Promise<string | null> {
    return redisClient.get(this.getLastSyncedAtKey(userId));
  }

  async getSyncMeta(userId: string): Promise<{
    lastSync: string;
    playlistCount: number;
    trackCount: number;
    artistCount: number;
  } | null> {
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
    await redisClient.expire(userKey, LIBRARY_TTL_SECONDS);
  }

  async storeUserDomain(user: User): Promise<void> {
    const userKey = this.getRedisKey(user.id, "user");
    const userData = convertToRedisUser(user);
    await redisClient.hSet(userKey, userData);
    await redisClient.expire(userKey, LIBRARY_TTL_SECONDS);
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
    playlists: SpotifyPlaylist[],
  ): Promise<void> {
    if (playlists.length === 0) return;

    // Pipeline writes to reduce round trips.
    const pipeline = redisClient.multi();
    for (const playlist of playlists) {
      const playlistKey = this.getRedisKey(userId, "playlist", playlist.id);
      const playlistData = convertSpotifyPlaylistToRedis(playlist);
      pipeline.hSet(playlistKey, playlistData);
      pipeline.expire(playlistKey, LIBRARY_TTL_SECONDS);
    }
    const indexKey = this.getPlaylistIndexKey(userId);
    pipeline.sAdd(
      indexKey,
      playlists.map((p) => p.id),
    );
    pipeline.expire(indexKey, LIBRARY_TTL_SECONDS);

    await pipeline.exec();
  }

  async storePlaylistsDomain(
    userId: string,
    playlists: Playlist[],
  ): Promise<void> {
    if (playlists.length === 0) return;

    const pipeline = redisClient.multi();
    for (const playlist of playlists) {
      const playlistKey = this.getRedisKey(userId, "playlist", playlist.id);
      const playlistData = convertToRedisPlaylist(playlist);
      pipeline.hSet(playlistKey, playlistData);
      pipeline.expire(playlistKey, LIBRARY_TTL_SECONDS);
    }
    const indexKey = this.getPlaylistIndexKey(userId);
    pipeline.sAdd(
      indexKey,
      playlists.map((p) => p.id),
    );
    pipeline.expire(indexKey, LIBRARY_TTL_SECONDS);

    await pipeline.exec();
  }

  async getUserPlaylists(userId: string): Promise<Playlist[]> {
    const playlistIds = await redisClient.sMembers(
      this.getPlaylistIndexKey(userId),
    );
    const playlists: Playlist[] = [];
    if (playlistIds.length === 0) return playlists;

    const pipeline = redisClient.multi();
    for (const playlistId of playlistIds) {
      pipeline.hGetAll(this.getRedisKey(userId, "playlist", playlistId));
      pipeline.zRange(
        this.getRedisKey(userId, "playlist", playlistId, "tracks"),
        0,
        -1,
      );
    }
    const results = await pipeline.exec();

    playlistIds.forEach((_, index) => {
      const playlistData = results[index * 2] as unknown as Record<
        string,
        string
      >;
      const trackIds = results[index * 2 + 1] as string[];

      if (playlistData && Object.keys(playlistData).length > 0) {
        const playlist = convertFromRedisPlaylist(playlistData);
        playlists.push({ ...playlist, trackCount: trackIds.length });
      }
    });

    return playlists;
  }

  async getPlaylist(
    userId: string,
    playlistId: string,
  ): Promise<Playlist | null> {
    const playlistKey = this.getRedisKey(userId, "playlist", playlistId);
    const playlistData = await redisClient.hGetAll(playlistKey);

    if (Object.keys(playlistData).length === 0) {
      return null;
    }

    const trackIds = await redisClient.zRange(
      this.getRedisKey(userId, "playlist", playlistId, "tracks"),
      0,
      -1,
    );

    return {
      ...convertFromRedisPlaylist(playlistData),
      trackCount: trackIds.length,
    };
  }

  async updatePlaylistType(
    userId: string,
    playlistId: string,
    playlistType: string,
  ): Promise<void> {
    const playlistKey = this.getRedisKey(userId, "playlist", playlistId);
    await redisClient.hSet(playlistKey, { playlistType });
    await redisClient.expire(playlistKey, LIBRARY_TTL_SECONDS);
  }

  async updateTrackOwnership(
    userId: string,
    trackId: string,
    ownership: string,
  ): Promise<void> {
    const trackKey = this.getRedisKey(userId, "track", trackId);
    await redisClient.hSet(trackKey, { ownership });
    await redisClient.expire(trackKey, LIBRARY_TTL_SECONDS);
  }

  // Pipelined lookup of which playlists each of the given tracks belongs to
  // (using the track:{id}:playlists sets already maintained by
  // storeTracks/storeTracksDomain/addTrackToPlaylist/removeTrackFromPlaylist).
  async getTrackPlaylistMemberships(
    userId: string,
    trackIds: string[],
  ): Promise<Record<string, string[]>> {
    const membershipMap: Record<string, string[]> = {};
    if (trackIds.length === 0) return membershipMap;

    const pipeline = redisClient.multi();
    trackIds.forEach((trackId) =>
      pipeline.sMembers(this.getRedisKey(userId, "track", trackId, "playlists")),
    );
    const results = await pipeline.exec();

    trackIds.forEach((trackId, index) => {
      membershipMap[trackId] = (results?.[index] as string[]) || [];
    });

    return membershipMap;
  }

  // Track operations
  async storeTracks(
    userId: string,
    playlistId: string,
    tracks: SpotifyTrack[],
  ): Promise<void> {
    if (tracks.length === 0) return;

    const tracksKey = this.getRedisKey(
      userId,
      "playlist",
      playlistId,
      "tracks",
    );

    // Clear existing sorted set once (maintains order via score).
    await redisClient.del(tracksKey);

    // Chunk pipelines to avoid enormous MULTI payloads for big playlists.
    const chunkSize = 200;
    // Scoped to the whole call so an album shared across many tracks (and
    // chunks) only gets written once instead of once per track.
    const writtenAlbumIds = new Set<string>();

    for (let offset = 0; offset < tracks.length; offset += chunkSize) {
      const chunk = tracks.slice(offset, offset + chunkSize);
      const pipeline = redisClient.multi();
      const sortedSetData: { score: number; value: string }[] = [];
      const touchedKeysThisChunk = new Set<string>();

      for (let i = 0; i < chunk.length; i++) {
        const globalIndex = offset + i;
        const track = chunk[i];
        const playlistPosition = globalIndex; // 0-based position in playlist

        const trackKey = this.getRedisKey(userId, "track", track.id);
        const trackData = convertSpotifyTrackToRedis(track, playlistPosition);

        // Track metadata
        pipeline.hSet(trackKey, trackData);
        touchedKeysThisChunk.add(trackKey);

        // Album metadata (shared across tracks, stored once)
        const albumId = track.album?.id;
        if (albumId && !writtenAlbumIds.has(albumId)) {
          writtenAlbumIds.add(albumId);
          const albumKey = this.getRedisKey(userId, "album", albumId);
          pipeline.hSet(albumKey, convertSpotifyAlbumToRedis(track.album));
          touchedKeysThisChunk.add(albumKey);
        }

        // Track-playlist relationship
        const trackPlaylistsKey = this.getRedisKey(
          userId,
          "track",
          track.id,
          "playlists",
        );
        pipeline.sAdd(trackPlaylistsKey, playlistId);
        touchedKeysThisChunk.add(trackPlaylistsKey);

        // Track ordering
        sortedSetData.push({ score: playlistPosition, value: track.id });

        // Artist relationships
        for (const artist of track.artists) {
          const artistId = artist.id;

          const artistTracksKey = this.getRedisKey(
            userId,
            "artist",
            artistId,
            "tracks",
          );
          pipeline.sAdd(artistTracksKey, track.id);
          touchedKeysThisChunk.add(artistTracksKey);

          const artistPlaylistsKey = this.getRedisKey(
            userId,
            "artist",
            artistId,
            "playlists",
          );
          pipeline.sAdd(artistPlaylistsKey, playlistId);
          touchedKeysThisChunk.add(artistPlaylistsKey);

          const trackArtistsKey = this.getRedisKey(
            userId,
            "track",
            track.id,
            "artists",
          );
          pipeline.sAdd(trackArtistsKey, artistId);
          touchedKeysThisChunk.add(trackArtistsKey);
        }
      }

      if (sortedSetData.length > 0) {
        pipeline.zAdd(tracksKey, sortedSetData);
        touchedKeysThisChunk.add(tracksKey);
      }

      const trackIndexKey = this.getTrackIndexKey(userId);
      pipeline.sAdd(
        trackIndexKey,
        chunk.map((t) => t.id),
      );
      touchedKeysThisChunk.add(trackIndexKey);

      for (const key of touchedKeysThisChunk) {
        pipeline.expire(key, LIBRARY_TTL_SECONDS);
      }

      await pipeline.exec();
    }
  }

  async storeTracksDomain(
    userId: string,
    playlistId: string,
    tracks: Track[],
  ): Promise<void> {
    if (tracks.length === 0) return;

    const tracksKey = this.getRedisKey(
      userId,
      "playlist",
      playlistId,
      "tracks",
    );

    // Clear existing sorted set once (maintains order via score).
    await redisClient.del(tracksKey);

    const chunkSize = 200;
    const writtenAlbumIds = new Set<string>();

    for (let offset = 0; offset < tracks.length; offset += chunkSize) {
      const chunk = tracks.slice(offset, offset + chunkSize);
      const pipeline = redisClient.multi();
      const sortedSetData: { score: number; value: string }[] = [];
      const touchedKeysThisChunk = new Set<string>();

      for (let i = 0; i < chunk.length; i++) {
        const globalIndex = offset + i;
        const track = chunk[i];
        const playlistPosition = globalIndex;

        const trackKey = this.getRedisKey(userId, "track", track.id);
        const trackData = convertToRedisTrack({
          ...track,
          playlistPosition,
        });

        pipeline.hSet(trackKey, trackData);
        touchedKeysThisChunk.add(trackKey);

        // Album metadata (shared across tracks, stored once). YouTube tracks
        // carry a fabricated per-video "album" (see persistUserData.ts
        // syncYoutube, id is `${channelId}:${videoId}`) that isn't a real,
        // browsable album — it only exists to carry the track's cover art
        // (the video thumbnail). The id must stay unique per video: reusing
        // the channel id would collide across an artist's tracks and this
        // dedupe would silently drop every thumbnail but the first. Consumers
        // use `type === "youtube"` to avoid treating it as a real album (no
        // Albums search section entry, no /albums/:id link).
        const albumId = track.album?.id;
        if (albumId && !writtenAlbumIds.has(albumId)) {
          writtenAlbumIds.add(albumId);
          const albumKey = this.getRedisKey(userId, "album", albumId);
          pipeline.hSet(albumKey, convertToRedisAlbum(track.album));
          touchedKeysThisChunk.add(albumKey);
        }

        // Track-playlist relationship
        const trackPlaylistsKey = this.getRedisKey(
          userId,
          "track",
          track.id,
          "playlists",
        );
        pipeline.sAdd(trackPlaylistsKey, playlistId);
        touchedKeysThisChunk.add(trackPlaylistsKey);

        // Track ordering
        sortedSetData.push({ score: playlistPosition, value: track.id });

        // Artist relationships
        for (const artistId of track.artistIds) {
          const artistTracksKey = this.getRedisKey(
            userId,
            "artist",
            artistId,
            "tracks",
          );
          pipeline.sAdd(artistTracksKey, track.id);
          touchedKeysThisChunk.add(artistTracksKey);

          const artistPlaylistsKey = this.getRedisKey(
            userId,
            "artist",
            artistId,
            "playlists",
          );
          pipeline.sAdd(artistPlaylistsKey, playlistId);
          touchedKeysThisChunk.add(artistPlaylistsKey);

          const trackArtistsKey = this.getRedisKey(
            userId,
            "track",
            track.id,
            "artists",
          );
          pipeline.sAdd(trackArtistsKey, artistId);
          touchedKeysThisChunk.add(trackArtistsKey);
        }
      }

      if (sortedSetData.length > 0) {
        pipeline.zAdd(tracksKey, sortedSetData);
        touchedKeysThisChunk.add(tracksKey);
      }

      const trackIndexKey = this.getTrackIndexKey(userId);
      pipeline.sAdd(
        trackIndexKey,
        chunk.map((t) => t.id),
      );
      touchedKeysThisChunk.add(trackIndexKey);

      for (const key of touchedKeysThisChunk) {
        pipeline.expire(key, LIBRARY_TTL_SECONDS);
      }

      await pipeline.exec();
    }
  }

  async storeArtistsDomain(userId: string, artists: Artist[]): Promise<void> {
    if (artists.length === 0) return;

    const pipeline = redisClient.multi();
    for (const artist of artists) {
      const artistKey = this.getRedisKey(userId, "artist", artist.id);
      const artistData = convertToRedisArtist(artist);
      pipeline.hSet(artistKey, artistData);
      pipeline.expire(artistKey, LIBRARY_TTL_SECONDS);
    }
    const indexKey = this.getArtistIndexKey(userId);
    pipeline.sAdd(
      indexKey,
      artists.map((a) => a.id),
    );
    pipeline.expire(indexKey, LIBRARY_TTL_SECONDS);

    await pipeline.exec();
  }

  // Fetches album hashes for a batch of (possibly duplicate/empty) album
  // IDs in a single pipelined round trip, deduped.
  private async fetchAlbumsByIds(
    userId: string,
    albumIds: (string | undefined)[],
  ): Promise<Map<string, Album>> {
    const uniqueIds = Array.from(
      new Set(albumIds.filter((id): id is string => !!id)),
    );
    const albumMap = new Map<string, Album>();
    if (uniqueIds.length === 0) return albumMap;

    const pipeline = redisClient.multi();
    uniqueIds.forEach((id) =>
      pipeline.hGetAll(this.getRedisKey(userId, "album", id)),
    );
    const results = await pipeline.exec();
    if (!results) return albumMap;

    uniqueIds.forEach((id, index) => {
      const data = results[index] as unknown as Record<string, string>;
      if (data && Object.keys(data).length > 0) {
        albumMap.set(id, convertFromRedisAlbum(data));
      }
    });

    return albumMap;
  }

  async getUserTracks(userId: string): Promise<Track[]> {
    const trackIds = await redisClient.sMembers(this.getTrackIndexKey(userId));
    if (trackIds.length === 0) return [];

    const pipeline = redisClient.multi();
    trackIds.forEach((id) =>
      pipeline.hGetAll(this.getRedisKey(userId, "track", id)),
    );
    const results = await pipeline.exec();

    const rawTracks = (results || [])
      .map((data) => data as unknown as Record<string, string>)
      .filter((data) => data && Object.keys(data).length > 0);

    const albumMap = await this.fetchAlbumsByIds(
      userId,
      rawTracks.map((data) => data.albumId),
    );

    const tracks = rawTracks.map((data) =>
      convertFromRedisTrack(data, albumMap.get(data.albumId)),
    );

    return tracks.sort((a, b) => b.name.localeCompare(a.name));
  }

  async getPlaylistTracks(
    userId: string,
    playlistId: string,
  ): Promise<Track[]> {
    const tracksKey = this.getRedisKey(
      userId,
      "playlist",
      playlistId,
      "tracks",
    );
    const trackIds = await redisClient.zRange(tracksKey, 0, -1);

    if (trackIds.length === 0) return [];

    const pipeline = redisClient.multi();
    trackIds.forEach((trackId) =>
      pipeline.hGetAll(this.getRedisKey(userId, "track", trackId)),
    );
    const results = await pipeline.exec();
    const rawTracks = (results || []).map(
      (data) => data as unknown as Record<string, string>,
    );

    const albumMap = await this.fetchAlbumsByIds(
      userId,
      rawTracks
        .filter((data) => data && Object.keys(data).length > 0)
        .map((data) => data.albumId),
    );

    const tracks: Track[] = [];
    rawTracks.forEach((data, i) => {
      if (data && Object.keys(data).length > 0) {
        const track = convertFromRedisTrack(data, albumMap.get(data.albumId));
        // Set position from the sorted set order
        track.playlistPosition = i;
        tracks.push(track);
      }
    });

    return tracks;
  }

  async getArtistTracks(userId: string, artistId: string): Promise<Track[]> {
    const trackIds = await redisClient.sMembers(
      this.getRedisKey(userId, "artist", artistId, "tracks"),
    );

    if (trackIds.length === 0) return [];

    const pipeline = redisClient.multi();
    trackIds.forEach((trackId) =>
      pipeline.hGetAll(this.getRedisKey(userId, "track", trackId)),
    );
    const results = await pipeline.exec();

    const rawTracks = (results || [])
      .map((data) => data as unknown as Record<string, string>)
      .filter((data) => data && Object.keys(data).length > 0);

    const albumMap = await this.fetchAlbumsByIds(
      userId,
      rawTracks.map((data) => data.albumId),
    );

    return rawTracks.map((data) =>
      convertFromRedisTrack(data, albumMap.get(data.albumId)),
    );
  }

  // Albums aren't stored as their own domain (Spotify albums are fetched
  // live; YouTube has no album concept), so derive them from tracks that are
  // already cached — this keeps album lookups working for both sources.
  async getAlbumTracks(userId: string, albumId: string): Promise<Track[]> {
    const tracks = await this.getUserTracks(userId);
    return tracks.filter((track) => track.album.id === albumId);
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
      pipeline.expire(artistKey, LIBRARY_TTL_SECONDS);
    }
    const indexKey = this.getArtistIndexKey(userId);
    pipeline.sAdd(
      indexKey,
      artists.map((a) => a.id),
    );
    pipeline.expire(indexKey, LIBRARY_TTL_SECONDS);
    await pipeline.exec();
  }

  async getUserArtists(userId: string): Promise<Artist[]> {
    const artistIds = await redisClient.sMembers(
      this.getArtistIndexKey(userId),
    );
    const artists: Artist[] = [];
    if (artistIds.length === 0) return artists;

    const pipeline = redisClient.multi();
    for (const artistId of artistIds) {
      pipeline.hGetAll(this.getRedisKey(userId, "artist", artistId));
      pipeline.sMembers(this.getRedisKey(userId, "artist", artistId, "tracks"));
    }
    const results = await pipeline.exec();

    artistIds.forEach((_, index) => {
      const artistData = results[index * 2] as unknown as Record<
        string,
        string
      >;
      const trackIds = results[index * 2 + 1] as string[];

      if (artistData && Object.keys(artistData).length > 0) {
        const artist = convertFromRedisArtist(artistData);
        artists.push({ ...artist, trackCount: trackIds.length });
      }
    });

    return artists;
  }

  async getArtistsByIds(
    userId: string,
    artistIds: string[],
  ): Promise<Artist[]> {
    if (artistIds.length === 0) return [];

    const pipeline = redisClient.multi();

    const artistKeys = artistIds.map((id) =>
      this.getRedisKey(userId, "artist", id),
    );
    artistKeys.forEach((key) => pipeline.hGetAll(key));

    const trackKeys = artistIds.map((id) =>
      this.getRedisKey(userId, "artist", id, "tracks"),
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
            artistData as unknown as Record<string, string>,
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
      this.getRedisKey(userId, "artist", artistId, "tracks"),
    );

    return {
      ...convertFromRedisArtist(artistData),
      trackCount: trackIds.length,
    };
  }

  async getPlaylistData(
    userId: string,
    playlistId: string,
  ): Promise<PlaylistData | null> {
    // Fetch playlist and track IDs
    const [playlistData, trackIds] = await Promise.all([
      redisClient.hGetAll(this.getRedisKey(userId, "playlist", playlistId)),
      redisClient.zRange(
        this.getRedisKey(userId, "playlist", playlistId, "tracks"),
        0,
        -1,
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

    // Pass 1: extract raw track hashes + their artist IDs. Album hashes
    // need to be fetched (based on the albumIds seen here) before we can
    // build the final hydrated Track objects.
    const rawTrackEntries: {
      index: number;
      trackData: Record<string, string>;
      artistIds: string[];
    }[] = [];

    trackIds.forEach((_, index) => {
      const trackData = results[index * 2] as unknown as Record<string, string>;
      const artistIds = results[index * 2 + 1] as string[];

      if (trackData && Object.keys(trackData).length > 0) {
        rawTrackEntries.push({ index, trackData, artistIds: artistIds || [] });
      }
    });

    const albumMap = await this.fetchAlbumsByIds(
      userId,
      rawTrackEntries.map((entry) => entry.trackData.albumId),
    );

    // Pass 2: build the final tracks and collect stats now that album data
    // is available.
    const tracks: Track[] = [];
    const artistTrackCount = new Map<string, number>();
    let totalDurationMs = 0;

    rawTrackEntries.forEach(({ index, trackData, artistIds }) => {
      const track = convertFromRedisTrack(
        trackData,
        albumMap.get(trackData.albumId),
      );
      track.playlistPosition = index;
      tracks.push(track);
      totalDurationMs += track.durationMs;

      artistIds.forEach((artistId) => {
        artistTrackCount.set(
          artistId,
          (artistTrackCount.get(artistId) || 0) + 1,
        );
      });
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
    track: SpotifyTrack,
  ): Promise<void> {
    const trackKey = this.getRedisKey(userId, "track", track.id);

    // Get the current highest position in the playlist
    const tracksKey = this.getRedisKey(
      userId,
      "playlist",
      playlistId,
      "tracks",
    );
    // Get the count of tracks in the playlist to determine next position
    const currentTrackCount = await redisClient.zCard(tracksKey);
    const nextPosition = currentTrackCount;

    // Store track metadata if it doesn't exist
    const trackData = convertSpotifyTrackToRedis(track, nextPosition);
    await redisClient.hSet(trackKey, trackData);
    await redisClient.expire(trackKey, LIBRARY_TTL_SECONDS);

    const trackIndexKey = this.getTrackIndexKey(userId);
    await redisClient.sAdd(trackIndexKey, track.id);
    await redisClient.expire(trackIndexKey, LIBRARY_TTL_SECONDS);

    // Store album metadata (shared across tracks, upserted here)
    if (track.album?.id) {
      const albumKey = this.getRedisKey(userId, "album", track.album.id);
      await redisClient.hSet(albumKey, convertSpotifyAlbumToRedis(track.album));
      await redisClient.expire(albumKey, LIBRARY_TTL_SECONDS);
    }

    // Store track-playlist relationship
    const trackPlaylistsKey = this.getRedisKey(
      userId,
      "track",
      track.id,
      "playlists",
    );
    await redisClient.sAdd(trackPlaylistsKey, playlistId);
    await redisClient.expire(trackPlaylistsKey, LIBRARY_TTL_SECONDS);

    // Add to playlist's sorted set
    await redisClient.zAdd(tracksKey, { score: nextPosition, value: track.id });
    await redisClient.expire(tracksKey, LIBRARY_TTL_SECONDS);

    // Store artist relationships
    for (const artist of track.artists) {
      // Store artist-track relationship
      const artistTracksKey = this.getRedisKey(
        userId,
        "artist",
        artist.id,
        "tracks",
      );
      await redisClient.sAdd(artistTracksKey, track.id);
      await redisClient.expire(artistTracksKey, LIBRARY_TTL_SECONDS);

      // Store artist-playlist relationship
      const artistPlaylistsKey = this.getRedisKey(
        userId,
        "artist",
        artist.id,
        "playlists",
      );
      await redisClient.sAdd(artistPlaylistsKey, playlistId);
      await redisClient.expire(artistPlaylistsKey, LIBRARY_TTL_SECONDS);

      // Store track-artist relationship
      const trackArtistsKey = this.getRedisKey(
        userId,
        "track",
        track.id,
        "artists",
      );
      await redisClient.sAdd(trackArtistsKey, artist.id);
      await redisClient.expire(trackArtistsKey, LIBRARY_TTL_SECONDS);
    }

    // Update playlist track count
    const playlistKey = this.getRedisKey(userId, "playlist", playlistId);
    const trackCount = await redisClient.zCard(tracksKey);
    await redisClient.hSet(playlistKey, { tracks: trackCount.toString() });
    await redisClient.expire(playlistKey, LIBRARY_TTL_SECONDS);
  }

  // Remove track from playlist
  async removeTrackFromPlaylist(
    userId: string,
    playlistId: string,
    trackId: string,
  ): Promise<void> {
    const tracksKey = this.getRedisKey(
      userId,
      "playlist",
      playlistId,
      "tracks",
    );

    // Remove from playlist's sorted set
    await redisClient.zRem(tracksKey, trackId);
    // EXPIRE on a key Redis already auto-deleted (now-empty ZSET) is a
    // harmless no-op.
    await redisClient.expire(tracksKey, LIBRARY_TTL_SECONDS);

    // Remove track-playlist relationship
    const trackPlaylistsKey = this.getRedisKey(
      userId,
      "track",
      trackId,
      "playlists",
    );
    await redisClient.sRem(trackPlaylistsKey, playlistId);
    await redisClient.expire(trackPlaylistsKey, LIBRARY_TTL_SECONDS);

    // Get track artists to update their relationships
    const artistIds = await redisClient.sMembers(
      this.getRedisKey(userId, "track", trackId, "artists"),
    );

    // Check if track still exists in other playlists
    const remainingPlaylists = await redisClient.sMembers(trackPlaylistsKey);

    // If track is not in any other playlist, remove it completely
    if (remainingPlaylists.length === 0) {
      // Remove track hash
      await redisClient.del(this.getRedisKey(userId, "track", trackId));
      await redisClient.sRem(this.getTrackIndexKey(userId), trackId);

      // Remove track-artist relationships
      await redisClient.del(
        this.getRedisKey(userId, "track", trackId, "artists"),
      );

      // Remove artist-track relationships
      for (const artistId of artistIds) {
        const artistTracksKey = this.getRedisKey(
          userId,
          "artist",
          artistId,
          "tracks",
        );
        await redisClient.sRem(artistTracksKey, trackId);
        await redisClient.expire(artistTracksKey, LIBRARY_TTL_SECONDS);
      }
    }

    // Update artist-playlist relationships
    for (const artistId of artistIds) {
      // Check if artist still has tracks in this playlist
      const artistTracks = await redisClient.sMembers(
        this.getRedisKey(userId, "artist", artistId, "tracks"),
      );
      const playlistTracks = await redisClient.zRange(tracksKey, 0, -1);

      const hasTracksInPlaylist = artistTracks.some((t) =>
        playlistTracks.includes(t),
      );

      // If no more tracks from this artist in the playlist, remove the relationship
      if (!hasTracksInPlaylist) {
        const artistPlaylistsKey = this.getRedisKey(
          userId,
          "artist",
          artistId,
          "playlists",
        );
        await redisClient.sRem(artistPlaylistsKey, playlistId);
        await redisClient.expire(artistPlaylistsKey, LIBRARY_TTL_SECONDS);
      }
    }

    // Update playlist track count
    const playlistKey = this.getRedisKey(userId, "playlist", playlistId);
    const trackCount = await redisClient.zCard(tracksKey);
    await redisClient.hSet(playlistKey, { tracks: trackCount.toString() });
    await redisClient.expire(playlistKey, LIBRARY_TTL_SECONDS);
  }

  // Helper method to delete all user data
  async deleteUserData(userId: string): Promise<void> {
    // Delete keys for this user *for this source only*.
    const allKeys = await this.scanKeys(
      `smart-spotify:${userId}:${this.source}:*`,
    );

    if (allKeys.length > 0) {
      await redisClient.del(allKeys);
    }
  }

  // Escape hatch for admin/debug use if needed.
  async deleteUserDataAllSources(userId: string): Promise<void> {
    const allKeys = await this.scanKeys(`smart-spotify:${userId}:*`);
    if (allKeys.length > 0) {
      await redisClient.del(allKeys);
    }
  }
}
