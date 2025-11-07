// Base types
export interface User {
  id: string;
  displayName: string;
  email: string;
}

export interface Image {
  url: string;
  height?: number;
  width?: number;
}

export interface ExternalUrls {
  spotify: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  public: boolean;
  collaborative: boolean;
  trackCount: number;
  images: Image[];
  externalUrls: ExternalUrls;
  snapshotId: string;
}

export interface Track {
  id: string;
  name: string;
  durationMs: number;
  explicit: boolean;
  popularity: number;
  previewUrl: string | null;
  trackNumber: number;
  discNumber: number;
  externalUrls: ExternalUrls;
  artistIds: string[];
  artistNames: string[];
}

export interface Artist {
  id: string;
  name: string;
  images: Image[];
  externalUrls: ExternalUrls;
  trackCount: number;
}

// Response types
export interface SyncStatus {
  synced: boolean;
  last_sync?: string;
  stats?: {
    playlists: number;
    tracks: number;
    artists: number;
  };
  message?: string;
}

export interface PersistResponse {
  success: boolean;
  message: string;
  stats: {
    playlists: number;
    tracks: number;
    artists: number;
    user_id: string;
  };
}

// Aggregation types
export interface PlaylistAnalysis {
  playlistId: string;
  tracks: Track[];
  artists: Artist[];
  totalDurationMs: number;
}

// Spotify API types (raw from API)
export interface SpotifyUser {
  id: string;
  display_name?: string;
  email?: string;
  country?: string;
  followers?: { total: number };
  images?: SpotifyImage[];
  external_urls?: { spotify: string };
}

export interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string;
  owner: { id: string };
  public: boolean;
  collaborative: boolean;
  tracks: { total: number };
  images?: SpotifyImage[];
  external_urls?: { spotify: string };
  snapshot_id?: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  explicit: boolean;
  popularity: number;
  preview_url?: string;
  track_number: number;
  disc_number: number;
  external_urls?: { spotify: string };
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  is_local?: boolean;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  external_urls?: { spotify: string };
  images?: SpotifyImage[];
  followers?: { total: number };
  genres?: string[];
  popularity?: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date?: string;
  total_tracks?: number;
  images?: SpotifyImage[];
  external_urls?: { spotify: string };
  artists?: SpotifyArtist[];
}

export interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylist[];
  total: number;
  offset: number;
  limit: number;
  next: string | null;
  previous: string | null;
}

export interface SpotifyPlaylistTracksResponse {
  items: { track: SpotifyTrack }[];
  total: number;
  offset: number;
  limit: number;
  next: string | null;
  previous: string | null;
}

export interface SpotifySearchResponse {
  tracks?: {
    items: SpotifyTrack[];
    total: number;
  };
  artists?: {
    items: SpotifyArtist[];
    total: number;
  };
  albums?: {
    items: SpotifyAlbum[];
    total: number;
  };
  playlists?: {
    items: SpotifyPlaylist[];
    total: number;
  };
}

export interface SpotifyArtistsResponse {
  artists: SpotifyArtist[];
}
