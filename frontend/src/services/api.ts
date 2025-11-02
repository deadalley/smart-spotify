import {
  Artist,
  PersistResponse,
  Playlist,
  SpotifyArtistsResponse,
  SpotifyPlaylist,
  SpotifyPlaylistsResponse,
  SpotifyPlaylistTracksResponse,
  SpotifySearchResponse,
  Track,
} from "@smart-spotify/shared";
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
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

  // Artists
  getArtists: () => api.get<SpotifyArtistsResponse>(`/spotify/artists`),
  getArtistTracks: (artistId: string) =>
    api.get<Track[]>(`/spotify/artists/${artistId}/tracks`),

  // Search
  search: (query: string, type = "track", limit = 20) =>
    api.get<SpotifySearchResponse>(
      `/spotify/search?q=${encodeURIComponent(
        query
      )}&type=${type}&limit=${limit}`
    ),
};

// Base api endpoints
export const baseAPI = {
  // Data persistence
  persist: () => api.post<PersistResponse>("/persist"),
  getSyncStatus: () => api.get("/persist/status"),

  // Cached data
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
};

// Axios interceptors for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      try {
        await authAPI.refreshToken();
        // Retry the original request
        return api.request(error.config);
      } catch (refreshError) {
        // Redirect to login if refresh fails
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
