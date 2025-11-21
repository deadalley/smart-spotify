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

export enum PlaylistType {
  MOOD = "mood",
  GENRE = "genre",
  COLLECTION = "collection",
  ARTIST = "artist",
  OTHER = "other",
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
  playlistType?: PlaylistType;
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
  playlistPosition?: number; // Position in the playlist (0-based index)
  externalUrls: ExternalUrls;
  artistIds: string[];
  artistNames: string[];
  album: Album;
}

export interface Artist {
  id: string;
  name: string;
  images: Image[];
  externalUrls: ExternalUrls;
  trackCount: number;
  genres: string[];
}

export interface Album {
  id: string;
  name: string;
  type: string;
  releaseDate?: string;
  totalTracks?: number;
  images?: Image[];
  externalUrls?: { spotify: string };
}

export interface AlbumImage {
  url: string;
  height?: number;
  width?: number;
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
  jobId?: string;
  status?: string;
  stats?: {
    playlists: number;
    tracks: number;
    artists: number;
    user_id: string;
  };
}

// Aggregation types
export interface GenreOutlier {
  artist: Artist;
  trackCount: number;
  artistGenres: string[];
  deviationScore: number; // 0-100, higher means more outlier
  commonGenres: string[]; // Genres this artist shares with the playlist
  uniqueGenres: string[]; // Genres this artist has that are uncommon in playlist
}

export interface DecadeDistribution {
  decade: string; // e.g., "1960s", "1970s"
  count: number;
  percentage: number;
}

export interface TimeOutlier {
  track: Track;
  releaseYear: number;
  deviationYears: number; // How many years away from median
}

export interface PlaylistConsistencyAnalysis {
  consistencyScore: number; // 0-100, higher is more consistent
  outliers: GenreOutlier[];
  mainGenres: string[]; // Top 5-10 most common genres
  totalArtists: number;
  timeAnalysis?: {
    medianYear: number;
    yearRange: { min: number; max: number };
    decadeDistribution: DecadeDistribution[];
    timeOutliers: TimeOutlier[];
  };
}

export interface PlaylistData {
  playlist: Playlist;
  tracks: Track[];
  artists: Artist[];
  genres: { name: string; count: number }[];
  totalDurationMs: number;
}

export interface TrackAggregationResult {
  track: Track;
  currentPlaylists: Playlist[];
  suggestedPlaylists: {
    playlist: Playlist;
    similarGenres: { name: string; count: number }[];
    similarArtists: Artist[];
  }[];
}

export interface PlaylistAnalysisResult extends PlaylistData {
  consistencyAnalysis?: PlaylistConsistencyAnalysis;
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
