/* eslint-disable no-unused-vars */

// Base types for internal use
export interface User {
  id: string;
  display_name: string;
  email: string;
  country: string;
  followers: number;
  images: Image[];
  external_urls: ExternalUrls;
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
  owner_id: string;
  public: boolean;
  collaborative: boolean;
  tracks_total: number;
  images: Image[];
  external_urls: ExternalUrls;
  snapshot_id: string;
}

export interface Track {
  id: string;
  name: string;
  duration_ms: number;
  explicit: boolean;
  popularity: number;
  preview_url: string | null;
  track_number: number;
  disc_number: number;
  external_urls: ExternalUrls;
  artist_ids: string[];
  artist_names: string[];
  album_id: string;
  album_name: string;
  album_type: string;
  album_release_date: string;
  album_images: Image[];
}

export interface Artist {
  id: string;
  name: string;
  popularity: number;
  followers: number;
  genres: string[];
  images: Image[];
  external_urls: ExternalUrls;
  track_count?: number;
}

export interface Album {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  total_tracks: number;
  images: Image[];
  external_urls: ExternalUrls;
  artist_ids: string[];
}

// Response types
export interface PlaylistsResponse {
  items: Playlist[];
  total: number;
}

export interface TracksResponse {
  items: { track: Track }[];
  total: number;
}

export interface ArtistsResponse {
  items: Artist[];
  total: number;
}

export interface ArtistTracksResponse {
  artist: Artist | null;
  tracks: TracksResponse;
}

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

// BullMQ types
export enum JobQueues {
  PERSIST_USER_DATA = "smart-spotify-persist-user-data",
}

export enum JobStatus {
  WAITING = "waiting",
  ACTIVE = "active",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface JobProgress {
  status: JobStatus;
  progress: number;
  message: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  stats?: {
    playlists: number;
    tracks: number;
    artists: number;
  };
}
