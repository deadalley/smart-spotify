import {
  Artist,
  Playlist,
  SpotifyArtist,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyUser,
  Track,
  User,
} from "../types";

export class ParserService {
  // Spotify
  static convertFromSpotifyUser(spotifyUser: SpotifyUser): User {
    return {
      id: spotifyUser.id,
      displayName: spotifyUser.display_name || "",
      email: spotifyUser.email || "",
    };
  }

  static convertFromSpotifyPlaylist(
    spotifyPlaylist: SpotifyPlaylist
  ): Playlist {
    return {
      id: spotifyPlaylist.id,
      name: spotifyPlaylist.name,
      description: spotifyPlaylist.description || "",
      ownerId: spotifyPlaylist.owner.id,
      public: spotifyPlaylist.public,
      collaborative: spotifyPlaylist.collaborative,
      trackCount: spotifyPlaylist.tracks.total,
      images: spotifyPlaylist.images || [],
      externalUrls: spotifyPlaylist.external_urls || { spotify: "" },
      snapshotId: spotifyPlaylist.snapshot_id || "",
    };
  }

  static convertFromSpotifyTrack(spotifyTrack: SpotifyTrack): Track {
    return {
      id: spotifyTrack.id,
      name: spotifyTrack.name,
      durationMs: spotifyTrack.duration_ms,
      explicit: spotifyTrack.explicit,
      popularity: spotifyTrack.popularity,
      previewUrl: spotifyTrack.preview_url || null,
      trackNumber: spotifyTrack.track_number,
      discNumber: spotifyTrack.disc_number,
      externalUrls: spotifyTrack.external_urls || { spotify: "" },
      artistIds: spotifyTrack.artists.map((a) => a.id),
      artistNames: spotifyTrack.artists.map((a) => a.name),
    };
  }

  static convertFromSpotifyArtist(spotifyArtist: SpotifyArtist): Artist {
    return {
      id: spotifyArtist.id,
      name: spotifyArtist.name,
      images: spotifyArtist.images || [],
      externalUrls: spotifyArtist.external_urls || { spotify: "" },
      trackCount: 0, // Needs to be overwritten later
    };
  }

  // Redis
  static convertToRedisUser(user: User): Record<string, string> {
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
    };
  }

  static convertToRedisPlaylist(playlist: Playlist): Record<string, string> {
    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      ownerId: playlist.ownerId,
      public: playlist.public.toString(),
      collaborative: playlist.collaborative.toString(),
      trackCount: playlist.trackCount.toString(),
      images: JSON.stringify(playlist.images),
      externalUrls: JSON.stringify(playlist.externalUrls),
      snapshotId: playlist.snapshotId,
    };
  }

  static convertToRedisTrack(track: Track): Record<string, string> {
    return {
      id: track.id,
      name: track.name,
      durationMs: track.durationMs.toString(),
      explicit: track.explicit.toString(),
      popularity: track.popularity.toString(),
      previewUrl: track.previewUrl || "",
      trackNumber: track.trackNumber.toString(),
      discNumber: track.discNumber.toString(),
      externalUrls: JSON.stringify(track.externalUrls),
      artistIds: JSON.stringify(track.artistIds),
      artistNames: JSON.stringify(track.artistNames),
    };
  }

  static convertToRedisArtist(artist: Artist): Record<string, string> {
    return {
      id: artist.id,
      name: artist.name,
      externalUrls: JSON.stringify(artist.externalUrls),
    };
  }

  static convertFromRedisUser(data: Record<string, string>): User {
    return {
      id: data.id,
      displayName: data.displayName,
      email: data.email,
    };
  }

  static convertFromRedisPlaylist(data: Record<string, string>): Playlist {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      ownerId: data.ownerId,
      public: data.public === "true",
      collaborative: data.collaborative === "true",
      trackCount: parseInt(data.trackCount || "0"),
      images: JSON.parse(data.images || "[]"),
      externalUrls: JSON.parse(data.externalUrls || "{}"),
      snapshotId: data.snapshotId,
    };
  }

  static convertFromRedisTrack(data: Record<string, string>): Track {
    return {
      id: data.id,
      name: data.name,
      durationMs: parseInt(data.durationMs || "0"),
      explicit: data.explicit === "true",
      popularity: parseInt(data.popularity || "0"),
      previewUrl: data.previewUrl || null,
      trackNumber: parseInt(data.trackNumber || "0"),
      discNumber: parseInt(data.discNumber || "0"),
      externalUrls: JSON.parse(data.externalUrls || "{}"),
      artistIds: JSON.parse(data.artistIds || "[]"),
      artistNames: JSON.parse(data.artistNames || "[]"),
    };
  }

  static convertFromRedisArtist(data: Record<string, string>): Artist {
    return {
      id: data.id,
      name: data.name,
      images: JSON.parse(data.images || "[]"),
      externalUrls: JSON.parse(data.externalUrls || "{}"),
      trackCount: 0, // Needs to be overwritten later
    };
  }
}
