import {
  SpotifyArtist,
  SpotifyArtistsResponse,
  SpotifyPlaylist,
  SpotifyPlaylistsResponse,
  SpotifyPlaylistTracksResponse,
  SpotifyTrack,
  SpotifyUser,
} from "@smart-spotify/shared";
import axios from "axios";

export class SpotifyService {
  private baseURL = "https://api.spotify.com/v1";

  constructor(private accessToken: string) {}

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  async getCurrentUser(): Promise<SpotifyUser> {
    const response = await axios.get(`${this.baseURL}/me`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async getUserPlaylists(): Promise<SpotifyPlaylist[]> {
    const allPlaylists: SpotifyPlaylist[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(`${this.baseURL}/me/playlists`, {
        headers: this.getHeaders(),
        params: { limit, offset },
      });

      const data: SpotifyPlaylistsResponse = response.data;
      allPlaylists.push(...data.items);

      hasMore = data.next !== null;
      offset += limit;
    }

    return allPlaylists;
  }

  async getUserOwnedPlaylists(): Promise<SpotifyPlaylist[]> {
    const user = await this.getCurrentUser();
    const allPlaylists = await this.getUserPlaylists();

    return allPlaylists.filter((playlist) => playlist.owner.id === user.id);
  }

  async getPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
    const response = await axios.get(
      `${this.baseURL}/playlists/${playlistId}`,
      {
        headers: this.getHeaders(),
      }
    );
    return response.data;
  }

  async getPlaylistTracks(
    playlistId: string
  ): Promise<{ track: SpotifyTrack }[]> {
    const allTracks: { track: SpotifyTrack }[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(
        `${this.baseURL}/playlists/${playlistId}/tracks`,
        {
          headers: this.getHeaders(),
          params: { limit, offset },
        }
      );

      const data: SpotifyPlaylistTracksResponse = response.data;
      allTracks.push(...data.items);

      hasMore = data.next !== null;
      offset += limit;
    }

    return allTracks;
  }

  async getUserSavedTracks(): Promise<{ track: SpotifyTrack }[]> {
    const allTracks: { track: SpotifyTrack }[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(`${this.baseURL}/me/tracks`, {
        headers: this.getHeaders(),
        params: { limit, offset },
      });

      const data = response.data;
      allTracks.push(...data.items);

      hasMore = data.next !== null;
      offset += limit;
    }

    return allTracks;
  }

  async getArtists(artistIds: string[]): Promise<SpotifyArtist[]> {
    if (artistIds.length === 0) return [];

    const allArtists: SpotifyArtist[] = [];
    const batchSize = 50; // Spotify API limit

    for (let i = 0; i < artistIds.length; i += batchSize) {
      const batch = artistIds.slice(i, i + batchSize);
      const artistIdsString = batch.join(",");

      try {
        const response = await axios.get(
          `${this.baseURL}/artists?ids=${artistIdsString}`,
          {
            headers: this.getHeaders(),
          }
        );

        const data: SpotifyArtistsResponse = response.data;
        allArtists.push(...data.artists.filter((artist) => artist !== null));
      } catch (error) {
        console.error("Error fetching artist batch:", error);
        // Continue with next batch even if this one fails
      }
    }

    return allArtists;
  }

  async getArtist(artistId: string): Promise<SpotifyArtist> {
    const response = await axios.get(`${this.baseURL}/artists/${artistId}`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async getArtistsFromSavedTracks(): Promise<
    Map<string, { artist: SpotifyArtist; trackCount: number }>
  > {
    const savedTracks = await this.getUserSavedTracks();
    const artistsMap = new Map<
      string,
      { artist: SpotifyArtist; trackCount: number }
    >();

    // Extract unique artists with track counts
    savedTracks.forEach((item) => {
      if (item.track && item.track.artists) {
        item.track.artists.forEach((artist) => {
          if (artistsMap.has(artist.id)) {
            const existing = artistsMap.get(artist.id)!;
            existing.trackCount += 1;
          } else {
            artistsMap.set(artist.id, {
              artist,
              trackCount: 1,
            });
          }
        });
      }
    });

    // Enrich with detailed artist information
    const artistIds = Array.from(artistsMap.keys());
    const detailedArtists = await this.getArtists(artistIds);

    // Update the map with detailed information
    detailedArtists.forEach((detailedArtist) => {
      const existing = artistsMap.get(detailedArtist.id);
      if (existing) {
        artistsMap.set(detailedArtist.id, {
          artist: detailedArtist,
          trackCount: existing.trackCount,
        });
      }
    });

    return artistsMap;
  }

  async getArtistTracksFromSavedTracks(artistId: string): Promise<{
    artist: SpotifyArtist | null;
    tracks: { track: SpotifyTrack }[];
  }> {
    const [savedTracks, artistResult] = await Promise.allSettled([
      this.getUserSavedTracks(),
      this.getArtist(artistId),
    ]);

    const tracks = savedTracks.status === "fulfilled" ? savedTracks.value : [];
    const artist =
      artistResult.status === "fulfilled" ? artistResult.value : null;

    // Filter tracks by the specific artist
    const artistTracks = tracks.filter((item) => {
      if (item.track && item.track.artists) {
        return item.track.artists.some(
          (trackArtist) => trackArtist.id === artistId
        );
      }
      return false;
    });

    return {
      artist,
      tracks: artistTracks,
    };
  }

  async getTrack(trackId: string): Promise<SpotifyTrack> {
    const response = await axios.get(`${this.baseURL}/tracks/${trackId}`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
    await axios.post(
      `${this.baseURL}/playlists/${playlistId}/tracks`,
      {
        uris: [`spotify:track:${trackId}`],
      },
      {
        headers: this.getHeaders(),
      }
    );
  }
}
