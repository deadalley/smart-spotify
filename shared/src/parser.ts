import {
  Album,
  Artist,
  Playlist,
  PlaylistType,
  SpotifyAlbum,
  SpotifyArtist,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyUser,
  Track,
  User,
} from "./types";

export function convertFromSpotifyUser(spotifyUser: SpotifyUser): User {
  return {
    id: spotifyUser.id,
    displayName: spotifyUser.display_name || "",
    email: spotifyUser.email || "",
  };
}

export function convertFromSpotifyPlaylist(
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

export function convertFromSpotifyTrack(
  spotifyTrack: SpotifyTrack,
  playlistPosition?: number
): Track {
  return {
    id: spotifyTrack.id,
    name: spotifyTrack.name,
    durationMs: spotifyTrack.duration_ms,
    explicit: spotifyTrack.explicit,
    popularity: spotifyTrack.popularity,
    previewUrl: spotifyTrack.preview_url || null,
    trackNumber: spotifyTrack.track_number,
    discNumber: spotifyTrack.disc_number,
    playlistPosition,
    externalUrls: spotifyTrack.external_urls || { spotify: "" },
    artistIds: spotifyTrack.artists.map((a) => a.id),
    artistNames: spotifyTrack.artists.map((a) => a.name),
    album: convertFromSpotifyAlbum(spotifyTrack.album),
  };
}

export function convertFromSpotifyArtist(spotifyArtist: SpotifyArtist): Artist {
  return {
    id: spotifyArtist.id,
    name: spotifyArtist.name,
    images: spotifyArtist.images || [],
    externalUrls: spotifyArtist.external_urls || { spotify: "" },
    trackCount: 0, // Default to 0, can be updated later
    genres: spotifyArtist.genres || [],
  };
}

export function convertFromSpotifyAlbum(spotifyAlbum: SpotifyAlbum): Album {
  return {
    id: spotifyAlbum.id,
    name: spotifyAlbum.name,
    type: spotifyAlbum.album_type,
    releaseDate: spotifyAlbum.release_date,
    totalTracks: spotifyAlbum.total_tracks,
    images: spotifyAlbum.images || [],
    externalUrls: spotifyAlbum.external_urls || { spotify: "" },
  };
}

export function convertToRedisUser(user: User): Record<string, string> {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
  };
}

export function convertToRedisPlaylist(
  playlist: Playlist
): Record<string, string> {
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
    playlistType: playlist.playlistType || "",
  };
}

export function convertToRedisTrack(track: Track): Record<string, string> {
  return {
    id: track.id,
    name: track.name,
    durationMs: track.durationMs.toString(),
    explicit: track.explicit.toString(),
    popularity: track.popularity.toString(),
    previewUrl: track.previewUrl || "",
    trackNumber: track.trackNumber.toString(),
    discNumber: track.discNumber.toString(),
    playlistPosition: track.playlistPosition?.toString() || "",
    externalUrls: JSON.stringify(track.externalUrls),
    artistIds: JSON.stringify(track.artistIds),
    artistNames: JSON.stringify(track.artistNames),
    album: JSON.stringify(track.album),
  };
}

export function convertToRedisArtist(artist: Artist): Record<string, string> {
  return {
    id: artist.id,
    name: artist.name,
    images: JSON.stringify(artist.images),
    externalUrls: JSON.stringify(artist.externalUrls),
    trackCount: artist.trackCount.toString(),
    genres: JSON.stringify(artist.genres),
  };
}

export function convertFromRedisUser(data: Record<string, string>): User {
  return {
    id: data.id,
    displayName: data.displayName,
    email: data.email,
  };
}

export function convertFromRedisPlaylist(
  data: Record<string, string>
): Playlist {
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
    playlistType: data.playlistType
      ? (data.playlistType as PlaylistType)
      : undefined,
  };
}

export function convertFromRedisTrack(data: Record<string, string>): Track {
  return {
    id: data.id,
    name: data.name,
    durationMs: parseInt(data.durationMs || "0"),
    explicit: data.explicit === "true",
    popularity: parseInt(data.popularity || "0"),
    previewUrl: data.previewUrl || null,
    trackNumber: parseInt(data.trackNumber || "0"),
    discNumber: parseInt(data.discNumber || "0"),
    playlistPosition: data.playlistPosition
      ? parseInt(data.playlistPosition)
      : undefined,
    externalUrls: JSON.parse(data.externalUrls || "{}"),
    artistIds: JSON.parse(data.artistIds || "[]"),
    artistNames: JSON.parse(data.artistNames || "[]"),
    album: JSON.parse(data.album || "{}") as Album,
  };
}

export function convertFromRedisArtist(data: Record<string, string>): Artist {
  return {
    id: data.id,
    name: data.name,
    images: JSON.parse(data.images || "[]"),
    externalUrls: JSON.parse(data.externalUrls || "{}"),
    trackCount: parseInt(data.trackCount || "0"),
    genres: JSON.parse(data.genres || "[]"),
  };
}

export function convertSpotifyUserToRedis(
  spotifyUser: SpotifyUser
): Record<string, string> {
  return {
    id: spotifyUser.id,
    displayName: spotifyUser.display_name || "",
    email: spotifyUser.email || "",
  };
}

export function convertSpotifyPlaylistToRedis(
  spotifyPlaylist: SpotifyPlaylist
): Record<string, string> {
  return {
    id: spotifyPlaylist.id,
    name: spotifyPlaylist.name,
    description: spotifyPlaylist.description || "",
    ownerId: spotifyPlaylist.owner.id,
    public: spotifyPlaylist.public.toString(),
    collaborative: spotifyPlaylist.collaborative.toString(),
    trackCount: spotifyPlaylist.tracks.total.toString(),
    images: JSON.stringify(spotifyPlaylist.images || []),
    externalUrls: JSON.stringify(
      spotifyPlaylist.external_urls || { spotify: "" }
    ),
    snapshotId: spotifyPlaylist.snapshot_id || "",
    playlistType: "",
  };
}

export function convertSpotifyTrackToRedis(
  spotifyTrack: SpotifyTrack,
  playlistPosition?: number
): Record<string, string> {
  return {
    id: spotifyTrack.id,
    name: spotifyTrack.name,
    durationMs: spotifyTrack.duration_ms.toString(),
    explicit: spotifyTrack.explicit.toString(),
    popularity: spotifyTrack.popularity.toString(),
    previewUrl: spotifyTrack.preview_url || "",
    trackNumber: spotifyTrack.track_number.toString(),
    discNumber: spotifyTrack.disc_number.toString(),
    playlistPosition: playlistPosition?.toString() || "",
    externalUrls: JSON.stringify(spotifyTrack.external_urls || { spotify: "" }),
    artistIds: JSON.stringify(spotifyTrack.artists.map((a) => a.id)),
    artistNames: JSON.stringify(spotifyTrack.artists.map((a) => a.name)),
    album: JSON.stringify(convertFromSpotifyAlbum(spotifyTrack.album)),
  };
}

export function convertSpotifyArtistToRedis(
  spotifyArtist: SpotifyArtist
): Record<string, string> {
  return {
    id: spotifyArtist.id,
    name: spotifyArtist.name,
    images: JSON.stringify(spotifyArtist.images || []),
    externalUrls: JSON.stringify(
      spotifyArtist.external_urls || { spotify: "" }
    ),
    trackCount: "0", // Default to 0, will be calculated later
    genres: JSON.stringify(spotifyArtist.genres || []),
  };
}
