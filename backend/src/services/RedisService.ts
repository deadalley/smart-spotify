import { redisClient } from "../redis.js";
import {
  Artist,
  ArtistsResponse,
  ArtistTracksResponse,
  ExternalUrls,
  Playlist,
  PlaylistsResponse,
  SpotifyArtist,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyUser,
  SyncStatus,
  Track,
  TracksResponse,
  User,
} from "../types/index.js";

export class RedisService {
  // Helper methods to convert Spotify types to base types
  private convertSpotifyUser(spotifyUser: SpotifyUser): User {
    return {
      id: spotifyUser.id,
      display_name: spotifyUser.display_name || "",
      email: spotifyUser.email || "",
      country: spotifyUser.country || "",
      followers: spotifyUser.followers?.total || 0,
      images: spotifyUser.images || [],
      external_urls: spotifyUser.external_urls || { spotify: "" },
    };
  }

  private convertSpotifyPlaylist(spotifyPlaylist: SpotifyPlaylist): Playlist {
    return {
      id: spotifyPlaylist.id,
      name: spotifyPlaylist.name,
      description: spotifyPlaylist.description || "",
      owner_id: spotifyPlaylist.owner.id,
      public: spotifyPlaylist.public,
      collaborative: spotifyPlaylist.collaborative,
      tracks_total: spotifyPlaylist.tracks.total,
      images: spotifyPlaylist.images || [],
      external_urls: spotifyPlaylist.external_urls || { spotify: "" },
      snapshot_id: spotifyPlaylist.snapshot_id || "",
    };
  }

  private convertSpotifyTrack(spotifyTrack: SpotifyTrack): Track {
    return {
      id: spotifyTrack.id,
      name: spotifyTrack.name,
      duration_ms: spotifyTrack.duration_ms,
      explicit: spotifyTrack.explicit,
      popularity: spotifyTrack.popularity,
      preview_url: spotifyTrack.preview_url || null,
      track_number: spotifyTrack.track_number,
      disc_number: spotifyTrack.disc_number,
      external_urls: spotifyTrack.external_urls || { spotify: "" },
      artist_ids: spotifyTrack.artists.map((a) => a.id),
      artist_names: spotifyTrack.artists.map((a) => a.name),
      album_id: spotifyTrack.album.id,
      album_name: spotifyTrack.album.name,
      album_type: spotifyTrack.album.album_type,
      album_release_date: spotifyTrack.album.release_date || "",
      album_images: spotifyTrack.album.images || [],
    };
  }

  private convertSpotifyArtist(spotifyArtist: SpotifyArtist): Artist {
    return {
      id: spotifyArtist.id,
      name: spotifyArtist.name,
      popularity: spotifyArtist.popularity || 0,
      followers: spotifyArtist.followers?.total || 0,
      genres: spotifyArtist.genres || [],
      images: spotifyArtist.images || [],
      external_urls: spotifyArtist.external_urls || { spotify: "" },
    };
  }

  // User operations
  async storeUser(spotifyUser: SpotifyUser): Promise<void> {
    const user = this.convertSpotifyUser(spotifyUser);
    const userKey = `user:${user.id}`;

    await redisClient.hSet(userKey, {
      id: user.id,
      display_name: user.display_name,
      email: user.email,
      country: user.country,
      followers: user.followers.toString(),
      images: JSON.stringify(user.images),
      external_urls: JSON.stringify(user.external_urls),
    });
  }

  async getUser(userId: string): Promise<User | null> {
    const userKey = `user:${userId}`;
    const userData = await redisClient.hGetAll(userKey);

    if (Object.keys(userData).length === 0) {
      return null;
    }

    return {
      id: userData.id,
      display_name: userData.display_name,
      email: userData.email,
      country: userData.country,
      followers: parseInt(userData.followers || "0"),
      images: JSON.parse(userData.images || "[]"),
      external_urls: JSON.parse(userData.external_urls || "{}"),
    };
  }

  // Playlist operations
  async storePlaylists(
    userId: string,
    spotifyPlaylists: SpotifyPlaylist[]
  ): Promise<void> {
    const userKey = `user:${userId}`;

    for (const spotifyPlaylist of spotifyPlaylists) {
      const playlist = this.convertSpotifyPlaylist(spotifyPlaylist);
      const playlistKey = `playlist:${playlist.id}`;

      // Store playlist metadata
      await redisClient.hSet(playlistKey, {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        owner_id: playlist.owner_id,
        public: playlist.public.toString(),
        collaborative: playlist.collaborative.toString(),
        tracks_total: playlist.tracks_total.toString(),
        images: JSON.stringify(playlist.images),
        external_urls: JSON.stringify(playlist.external_urls),
        snapshot_id: playlist.snapshot_id,
      });

      // Add to user's playlists set
      await redisClient.sAdd(`${userKey}:playlists`, playlist.id);
    }
  }

  async getUserPlaylists(userId: string): Promise<PlaylistsResponse> {
    const userKey = `user:${userId}`;
    const playlistIds = await redisClient.sMembers(`${userKey}:playlists`);
    const playlists: Playlist[] = [];

    for (const playlistId of playlistIds) {
      const playlistData = await redisClient.hGetAll(`playlist:${playlistId}`);
      if (Object.keys(playlistData).length > 0) {
        playlists.push({
          id: playlistData.id,
          name: playlistData.name,
          description: playlistData.description,
          owner_id: playlistData.owner_id,
          public: playlistData.public === "true",
          collaborative: playlistData.collaborative === "true",
          tracks_total: parseInt(playlistData.tracks_total || "0"),
          images: JSON.parse(playlistData.images || "[]"),
          external_urls: JSON.parse(playlistData.external_urls || "{}"),
          snapshot_id: playlistData.snapshot_id,
        });
      }
    }

    return {
      items: playlists,
      total: playlists.length,
    };
  }

  // Track operations
  async storeTracks(
    playlistId: string,
    spotifyTracks: { track: SpotifyTrack }[]
  ): Promise<void> {
    const playlistKey = `playlist:${playlistId}`;
    const trackIds: string[] = [];

    for (const item of spotifyTracks) {
      if (item.track && !item.track.is_local) {
        const track = this.convertSpotifyTrack(item.track);
        const trackKey = `track:${track.id}`;

        // Store track metadata
        await redisClient.hSet(trackKey, {
          id: track.id,
          name: track.name,
          duration_ms: track.duration_ms.toString(),
          explicit: track.explicit.toString(),
          popularity: track.popularity.toString(),
          preview_url: track.preview_url || "",
          track_number: track.track_number.toString(),
          disc_number: track.disc_number.toString(),
          album_id: track.album_id,
          album_name: track.album_name,
          album_type: track.album_type,
          album_release_date: track.album_release_date,
          album_images: JSON.stringify(track.album_images),
          external_urls: JSON.stringify(track.external_urls),
          artist_ids: JSON.stringify(track.artist_ids),
          artist_names: JSON.stringify(track.artist_names),
        });

        trackIds.push(track.id);

        // Store track-playlist relationship
        await redisClient.sAdd(`${trackKey}:playlists`, playlistId);

        // Store artist relationships
        for (let i = 0; i < track.artist_ids.length; i++) {
          const artistId = track.artist_ids[i];
          const artistKey = `artist:${artistId}`;

          // Store artist-track relationship
          await redisClient.sAdd(`${artistKey}:tracks`, track.id);

          // Store artist-playlist relationship
          await redisClient.sAdd(`${artistKey}:playlists`, playlistId);

          // Store track-artist relationship
          await redisClient.sAdd(`${trackKey}:artists`, artistId);
        }

        // Store album relationships
        const albumKey = `album:${track.album_id}`;
        await redisClient.sAdd(`${albumKey}:tracks`, track.id);
      }
    }

    // Store playlist tracks as an ordered list
    if (trackIds.length > 0) {
      await redisClient.del(`${playlistKey}:tracks`);
      await redisClient.lPush(`${playlistKey}:tracks`, trackIds.reverse());
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<TracksResponse> {
    const playlistKey = `playlist:${playlistId}`;
    const trackIds = await redisClient.lRange(`${playlistKey}:tracks`, 0, -1);
    const tracks: { track: Track }[] = [];

    for (const trackId of trackIds) {
      const trackData = await redisClient.hGetAll(`track:${trackId}`);
      if (Object.keys(trackData).length > 0) {
        const track: Track = {
          id: trackData.id,
          name: trackData.name,
          duration_ms: parseInt(trackData.duration_ms || "0"),
          explicit: trackData.explicit === "true",
          popularity: parseInt(trackData.popularity || "0"),
          preview_url: trackData.preview_url || null,
          track_number: parseInt(trackData.track_number || "0"),
          disc_number: parseInt(trackData.disc_number || "0"),
          external_urls: JSON.parse(trackData.external_urls || "{}"),
          artist_ids: JSON.parse(trackData.artist_ids || "[]"),
          artist_names: JSON.parse(trackData.artist_names || "[]"),
          album_id: trackData.album_id,
          album_name: trackData.album_name,
          album_type: trackData.album_type,
          album_release_date: trackData.album_release_date,
          album_images: JSON.parse(trackData.album_images || "[]"),
        };

        tracks.push({ track });
      }
    }

    return {
      items: tracks,
      total: tracks.length,
    };
  }

  // Artist operations
  async storeArtists(spotifyArtists: SpotifyArtist[]): Promise<void> {
    for (const spotifyArtist of spotifyArtists) {
      const artist = this.convertSpotifyArtist(spotifyArtist);
      const artistKey = `artist:${artist.id}`;

      await redisClient.hSet(artistKey, {
        id: artist.id,
        name: artist.name,
        popularity: artist.popularity.toString(),
        followers: artist.followers.toString(),
        genres: JSON.stringify(artist.genres),
        images: JSON.stringify(artist.images),
        external_urls: JSON.stringify(artist.external_urls),
      });
    }
  }

  async storeBasicArtist(
    artistId: string,
    name: string,
    externalUrls: ExternalUrls = { spotify: "" }
  ): Promise<void> {
    const artistKey = `artist:${artistId}`;

    // Only store if the artist doesn't already exist or has minimal data
    const existingData = await redisClient.hGetAll(artistKey);
    if (Object.keys(existingData).length === 0 || !existingData.popularity) {
      await redisClient.hSet(artistKey, {
        id: artistId,
        name: name,
        external_urls: JSON.stringify(externalUrls),
        popularity: existingData.popularity || "0",
        followers: existingData.followers || "0",
        genres: existingData.genres || "[]",
        images: existingData.images || "[]",
      });
    }
  }

  async getAllArtists(): Promise<ArtistsResponse> {
    const artistKeys = await redisClient.keys("artist:*");
    const artists: Artist[] = [];

    for (const artistKey of artistKeys) {
      const artistData = await redisClient.hGetAll(artistKey);
      if (Object.keys(artistData).length > 0) {
        const trackCount = await redisClient.sCard(`${artistKey}:tracks`);

        const artist: Artist = {
          id: artistData.id,
          name: artistData.name,
          popularity: parseInt(artistData.popularity || "0"),
          followers: parseInt(artistData.followers || "0"),
          genres: JSON.parse(artistData.genres || "[]"),
          images: JSON.parse(artistData.images || "[]"),
          external_urls: JSON.parse(artistData.external_urls || "{}"),
          track_count: trackCount,
        };

        artists.push(artist);
      }
    }

    // Sort by track count (most popular first)
    artists.sort((a, b) => (b.track_count || 0) - (a.track_count || 0));

    return {
      items: artists,
      total: artists.length,
    };
  }

  async getArtistTracks(artistId: string): Promise<ArtistTracksResponse> {
    const artistKey = `artist:${artistId}`;
    const artistData = await redisClient.hGetAll(artistKey);
    const trackIds = await redisClient.sMembers(`${artistKey}:tracks`);
    const tracks: { track: Track }[] = [];

    for (const trackId of trackIds) {
      const trackData = await redisClient.hGetAll(`track:${trackId}`);
      if (Object.keys(trackData).length > 0) {
        const track: Track = {
          id: trackData.id,
          name: trackData.name,
          duration_ms: parseInt(trackData.duration_ms || "0"),
          explicit: trackData.explicit === "true",
          popularity: parseInt(trackData.popularity || "0"),
          preview_url: trackData.preview_url || null,
          track_number: parseInt(trackData.track_number || "0"),
          disc_number: parseInt(trackData.disc_number || "0"),
          external_urls: JSON.parse(trackData.external_urls || "{}"),
          artist_ids: JSON.parse(trackData.artist_ids || "[]"),
          artist_names: JSON.parse(trackData.artist_names || "[]"),
          album_id: trackData.album_id,
          album_name: trackData.album_name,
          album_type: trackData.album_type,
          album_release_date: trackData.album_release_date,
          album_images: JSON.parse(trackData.album_images || "[]"),
        };

        tracks.push({ track });
      }
    }

    const artist: Artist | null =
      Object.keys(artistData).length > 0
        ? {
            id: artistData.id,
            name: artistData.name,
            popularity: parseInt(artistData.popularity || "0"),
            followers: parseInt(artistData.followers || "0"),
            genres: JSON.parse(artistData.genres || "[]"),
            images: JSON.parse(artistData.images || "[]"),
            external_urls: JSON.parse(artistData.external_urls || "{}"),
          }
        : null;

    return {
      artist,
      tracks: {
        items: tracks,
        total: tracks.length,
      },
    };
  }

  // Album operations
  async storeAlbums(spotifyTracks: { track: SpotifyTrack }[]): Promise<void> {
    const albumsMap = new Map<string, SpotifyTrack["album"]>();

    // Collect unique albums
    for (const item of spotifyTracks) {
      if (item.track && !item.track.is_local) {
        albumsMap.set(item.track.album.id, item.track.album);
      }
    }

    // Store each album
    for (const [albumId, album] of albumsMap) {
      const albumKey = `album:${albumId}`;

      await redisClient.hSet(albumKey, {
        id: album.id,
        name: album.name,
        album_type: album.album_type,
        release_date: album.release_date || "",
        total_tracks: album.total_tracks?.toString() || "0",
        images: JSON.stringify(album.images || []),
        external_urls: JSON.stringify(album.external_urls || {}),
        artist_ids: JSON.stringify(album.artists?.map((a) => a.id) || []),
      });
    }
  }

  // Sync metadata operations
  async storeSyncMetadata(
    userId: string,
    stats: {
      playlists: number;
      tracks: number;
      artists: number;
    }
  ): Promise<void> {
    const userKey = `user:${userId}`;

    await redisClient.hSet(`${userKey}:sync_metadata`, {
      last_sync: new Date().toISOString(),
      playlists_count: stats.playlists.toString(),
      tracks_count: stats.tracks.toString(),
      artists_count: stats.artists.toString(),
    });
  }

  async getSyncStatus(userId: string): Promise<SyncStatus> {
    const userKey = `user:${userId}`;
    const syncMetadata = await redisClient.hGetAll(`${userKey}:sync_metadata`);

    if (Object.keys(syncMetadata).length === 0) {
      return {
        synced: false,
        message: "No data found in Redis",
      };
    }

    return {
      synced: true,
      last_sync: syncMetadata.last_sync,
      stats: {
        playlists: parseInt(syncMetadata.playlists_count || "0"),
        tracks: parseInt(syncMetadata.tracks_count || "0"),
        artists: parseInt(syncMetadata.artists_count || "0"),
      },
    };
  }

  // Utility methods
  async getTrackCount(): Promise<number> {
    const trackKeys = await redisClient.keys("track:*");
    return trackKeys.length;
  }

  async getArtistCount(): Promise<number> {
    const artistKeys = await redisClient.keys("artist:*");
    return artistKeys.length;
  }

  async getAllArtistIds(): Promise<string[]> {
    const artistKeys = await redisClient.keys("artist:*");
    return artistKeys.map((key) => key.split(":")[1]);
  }
}
