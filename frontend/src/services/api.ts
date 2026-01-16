import {
  Album,
  Artist,
  PersistResponse,
  Playlist,
  PlaylistAnalysisResult,
  SpotifyArtistsResponse,
  SpotifyPlaylist,
  SpotifyPlaylistsResponse,
  SpotifyPlaylistTracksResponse,
  Track,
  TrackAggregationResult,
} from "@smart-spotify/shared";
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escapeRegExp(name)}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use((config) => {
  const csrf = getCookie("csrf_token");
  if (csrf) {
    config.headers = config.headers ?? {};
    config.headers["X-CSRF-Token"] = csrf;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  login: () => (window.location.href = "/api/auth/login"),
  logout: () => api.post("/auth/logout"),
  getUser: () => api.get("/auth/me"),
  refreshToken: () => api.post("/auth/refresh"),
};

// Spotify endpoints
export const spotifyAPI = {
  // Playlists
  getPlaylists: (offset = 0) =>
    api.get<SpotifyPlaylistsResponse>(`/spotify/playlists?offset=${offset}`),

  getPlaylist: (playlistId: string) =>
    api.get<SpotifyPlaylist>(`/spotify/playlists/${playlistId}`),

  getPlaylistTracks: (playlistId: string, offset = 0) =>
    api.get<SpotifyPlaylistTracksResponse>(
      `/spotify/playlists/${playlistId}/tracks?offset=${offset}`
    ),

  addTrackToPlaylist: (playlistId: string, trackId: string) =>
    api.post(`/spotify/playlists/${playlistId}/tracks`, { trackId }),

  // Artists
  getArtists: () => api.get<SpotifyArtistsResponse>(`/spotify/artists`),
  getArtistTracks: (artistId: string) =>
    api.get<SpotifyPlaylistTracksResponse>(`/spotify/artists/${artistId}/tracks`),
};

// Base api endpoints
export const baseAPI = {
  // Data persistence
  persist: () => api.post<PersistResponse>("/persist"),
  getSyncStatus: () => api.get("/persist/status"),
  deleteData: () => api.delete("/persist"),

  // Analysis and aggregation
  analyzePlaylist: (playlistId: string) =>
    api.get<PlaylistAnalysisResult>(`/playlists/${playlistId}/analyze`),
  aggregatePlaylists: () => api.post<Playlist[]>("/playlists/aggregate"),

  // Playlists
  getPlaylists: (offset = 0) =>
    api.get<Playlist[]>(`/playlists?offset=${offset}`),
  getPlaylist: (playlistId: string) =>
    api.get<Playlist>(`/playlists/${playlistId}`),
  getPlaylistTracks: (playlistId: string, offset = 0) =>
    api.get<Track[]>(`/playlists/${playlistId}/tracks?offset=${offset}`),

  // Artists
  getArtists: () => api.get<Artist[]>("/artists"),
  getArtist: (artistId: string) => api.get<Artist>(`/artists/${artistId}`),
  getArtistTracks: (artistId: string) =>
    api.get<Track[]>(`/artists/${artistId}/tracks`),

  // Albums
  getAlbum: (albumId: string) => api.get<Album>(`/albums/${albumId}`),
  getAlbumTracks: (albumId: string) =>
    api.get<Track[]>(`/albums/${albumId}/tracks`),

  // Saved tracks
  getSavedTracks: () => api.get<Track[]>("/tracks/saved"),
  getAggregatedLikedSongs: () =>
    api.get<TrackAggregationResult[]>("/tracks/aggregate"),
  unlikeTrack: (trackId: string) => api.delete(`/tracks/saved/${trackId}`),

  // Playlist type management
  updatePlaylistType: (playlistId: string, playlistType: string) =>
    api.patch(`/playlists/${playlistId}/type`, { playlistType }),
};

// Axios interceptor: transparently refresh Spotify access token on 401 once.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh when the refresh itself failed
    if (
      typeof originalRequest.url === "string" &&
      originalRequest.url.includes("/auth/refresh")
    ) {
      window.location.href = "/login";
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await authAPI.refreshToken();
      return api.request(originalRequest);
    } catch (refreshError) {
      window.location.href = "/login";
      return Promise.reject(refreshError);
    }
  }
);
