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
import type { AuthSource } from "../contexts/AuthContext";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escapeRegExp(name)}=([^;]*)`),
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
  login: (source: AuthSource) => {
    window.location.href =
      source === "youtube"
        ? "/api/auth/youtube/login"
        : "/api/auth/spotify/login";
  },
  logout: (source: AuthSource) =>
    api.post(
      source === "youtube" ? "/auth/youtube/logout" : "/auth/spotify/logout",
    ),
  // User
  getUser: () => api.get("/auth/me"),
  refreshToken: (source: AuthSource) =>
    api.post(
      source === "youtube" ? "/auth/youtube/refresh" : "/auth/spotify/refresh",
    ),
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
      `/spotify/playlists/${playlistId}/tracks?offset=${offset}`,
    ),

  addTrackToPlaylist: (playlistId: string, trackId: string) =>
    api.post(`/spotify/playlists/${playlistId}/tracks`, { trackId }),

  // Artists
  getArtists: () => api.get<SpotifyArtistsResponse>(`/spotify/artists`),
  getArtistTracks: (artistId: string) =>
    api.get<SpotifyPlaylistTracksResponse>(
      `/spotify/artists/${artistId}/tracks`,
    ),
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

// Axios interceptor: transparently refresh access token on 401 once.
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const status = error?.response?.status;
//     const originalRequest = error?.config as
//       | (typeof error.config & { _retry?: boolean })
//       | undefined;

//     if (status !== 401 || !originalRequest || originalRequest._retry) {
//       return Promise.reject(error);
//     }

//     // Don't try to refresh when the refresh itself failed
//     if (
//       typeof originalRequest.url === "string" &&
//       (originalRequest.url.includes("/auth/spotify/refresh") ||
//         originalRequest.url.includes("/auth/youtube/refresh"))
//     ) {
//       window.location.href = "/";
//       return Promise.reject(error);
//     }

//     originalRequest._retry = true;

//     try {
//       await authAPI.refreshToken(getStoredSource());
//       return api.request(originalRequest);
//     } catch (refreshError) {
//       window.location.href = "/";
//       return Promise.reject(refreshError);
//     }
//   },
// );
