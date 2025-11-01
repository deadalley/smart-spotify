/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, Router } from "express";
import { RedisService, SpotifyService } from "../services/index.js";

const router: Router = Router();

const requireAuth = (req: Request, res: Response, next: any) => {
  const access_token = req.cookies?.spotify_access_token;

  if (!access_token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  (req as any).accessToken = access_token;
  next();
};

router.get("/playlists", requireAuth, async (req: Request, res: Response) => {
  try {
    const spotifyService = new SpotifyService((req as any).accessToken);
    const userOwnedPlaylists = await spotifyService.getUserOwnedPlaylists();

    // Return the complete dataset with only user-owned playlists
    res.json({
      items: userOwnedPlaylists,
      total: userOwnedPlaylists.length,
      offset: 0,
      limit: userOwnedPlaylists.length,
      next: null,
      previous: null,
    });
  } catch (error: any) {
    console.error("Error fetching playlists:", error);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(500).json({ error: "Failed to fetch playlists" });
  }
});

router.get(
  "/playlists/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const playlist = await spotifyService.getPlaylist(req.params.id);

      res.json(playlist);
    } catch (error: any) {
      console.error("Error fetching playlist:", error);
      if (error.response?.status === 401) {
        return res.status(401).json({ error: "Token expired" });
      }
      res.status(500).json({ error: "Failed to fetch playlist" });
    }
  }
);

router.get(
  "/playlists/:id/tracks",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const tracks = await spotifyService.getPlaylistTracks(req.params.id);

      res.json({
        items: tracks,
        total: tracks.length,
        offset: 0,
        limit: tracks.length,
        next: null,
        previous: null,
      });
    } catch (error: any) {
      console.error("Error fetching playlist tracks:", error);
      if (error.response?.status === 401) {
        return res.status(401).json({ error: "Token expired" });
      }
      res.status(500).json({ error: "Failed to fetch playlist tracks" });
    }
  }
);

router.get("/search", requireAuth, async (req: Request, res: Response) => {
  const { q, type = "track", limit = 20 } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  try {
    const spotifyService = new SpotifyService((req as any).accessToken);
    const searchResults = await spotifyService.search(
      q as string,
      type as string,
      Number(limit)
    );

    res.json(searchResults);
  } catch (error: any) {
    console.error("Error searching tracks:", error);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(500).json({ error: "Failed to search tracks" });
  }
});

router.get("/artists", requireAuth, async (req: Request, res: Response) => {
  try {
    const spotifyService = new SpotifyService((req as any).accessToken);
    const artistsWithCounts = await spotifyService.getArtistsFromSavedTracks();

    // Convert to array and add track_count field
    const artists = Array.from(artistsWithCounts.values()).map(
      ({ artist, trackCount }) => ({
        ...artist,
        track_count: trackCount,
      })
    );

    // Sort by track count (most popular first)
    artists.sort((a, b) => b.track_count - a.track_count);

    res.json({
      items: artists,
      total: artists.length,
    });
  } catch (error: any) {
    console.error("Error fetching artists:", error);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(500).json({ error: "Failed to fetch artists" });
  }
});

router.get(
  "/artists/:id/tracks",
  requireAuth,
  async (req: Request, res: Response) => {
    const artistId = req.params.id;

    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const result = await spotifyService.getArtistTracksFromSavedTracks(
        artistId
      );

      res.json({
        artist: result.artist,
        tracks: {
          items: result.tracks,
          total: result.tracks.length,
        },
      });
    } catch (error: any) {
      console.error("Error fetching artist tracks:", error);
      if (error.response?.status === 401) {
        return res.status(401).json({ error: "Token expired" });
      }
      res.status(500).json({ error: "Failed to fetch artist tracks" });
    }
  }
);

// New endpoint to persist all Spotify data to Redis
router.post("/persist", requireAuth, async (req: Request, res: Response) => {
  try {
    const spotifyService = new SpotifyService((req as any).accessToken);
    const redisService = new RedisService();

    // Get user information and store it
    const user = await spotifyService.getCurrentUser();
    await redisService.storeUser(user);

    // Get user-owned playlists and store them
    const userOwnedPlaylists = await spotifyService.getUserOwnedPlaylists();
    await redisService.storePlaylists(user.id, userOwnedPlaylists);

    // Fetch and store tracks for each playlist
    const allSpotifyTracks: { track: any }[] = [];
    for (const playlist of userOwnedPlaylists) {
      const playlistTracks = await spotifyService.getPlaylistTracks(
        playlist.id
      );
      await redisService.storeTracks(user.id, playlist.id, playlistTracks);

      // Store albums from tracks
      await redisService.storeAlbums(user.id, playlistTracks);

      // Collect artist info for later enrichment
      for (const item of playlistTracks) {
        if (item.track && item.track.artists) {
          for (const artist of item.track.artists) {
            await redisService.storeBasicArtist(
              user.id,
              artist.id,
              artist.name,
              artist.external_urls
            );
          }
        }
      }

      allSpotifyTracks.push(...playlistTracks);
    }

    // Get unique artist IDs and enrich with detailed info
    const uniqueArtistIds = await redisService.getAllArtistIds(user.id);
    const detailedArtists = await spotifyService.getArtists(uniqueArtistIds);
    await redisService.storeArtists(user.id, detailedArtists);

    // Store sync metadata
    const trackCount = await redisService.getTrackCount(user.id);
    const artistCount = await redisService.getArtistCount(user.id);

    await redisService.storeSyncMetadata(user.id, {
      playlists: userOwnedPlaylists.length,
      tracks: trackCount,
      artists: artistCount,
    });

    res.json({
      success: true,
      message: "Spotify data successfully persisted to Redis",
      stats: {
        playlists: userOwnedPlaylists.length,
        tracks: trackCount,
        artists: artistCount,
        user_id: user.id,
      },
    });
  } catch (error: any) {
    console.error("Error persisting Spotify data:", error);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(500).json({
      error: "Failed to persist Spotify data",
      details: error.message,
    });
  }
});

// Helper endpoints to retrieve persisted data from Redis

// Get user's sync metadata
router.get("/sync/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const spotifyService = new SpotifyService((req as any).accessToken);
    const redisService = new RedisService();

    const user = await spotifyService.getCurrentUser();
    const syncStatus = await redisService.getSyncStatus(user.id);

    res.json(syncStatus);
  } catch (error: any) {
    console.error("Error checking sync status:", error);
    res.status(500).json({ error: "Failed to check sync status" });
  }
});

// Get cached playlists from Redis
router.get(
  "/cached/playlists",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const redisService = new RedisService();

      const user = await spotifyService.getCurrentUser();
      const playlistsResponse = await redisService.getUserPlaylists(user.id);

      res.json(playlistsResponse);
    } catch (error: any) {
      console.error("Error fetching cached playlists:", error);
      res.status(500).json({ error: "Failed to fetch cached playlists" });
    }
  }
);

// Get cached playlist tracks from Redis
router.get(
  "/cached/playlists/:id/tracks",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const redisService = new RedisService();
      const playlistId = req.params.id;

      const user = await spotifyService.getCurrentUser();
      const tracksResponse = await redisService.getPlaylistTracks(
        user.id,
        playlistId
      );

      res.json(tracksResponse);
    } catch (error: any) {
      console.error("Error fetching cached playlist tracks:", error);
      res.status(500).json({ error: "Failed to fetch cached playlist tracks" });
    }
  }
);

// Get cached artists from Redis
router.get(
  "/cached/artists",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const redisService = new RedisService();

      const user = await spotifyService.getCurrentUser();
      const artistsResponse = await redisService.getAllArtists(user.id);

      res.json(artistsResponse);
    } catch (error: any) {
      console.error("Error fetching cached artists:", error);
      res.status(500).json({ error: "Failed to fetch cached artists" });
    }
  }
);

// Get cached artist tracks from Redis
router.get(
  "/cached/artists/:id/tracks",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const redisService = new RedisService();
      const artistId = req.params.id;

      const user = await spotifyService.getCurrentUser();
      const artistTracksResponse = await redisService.getArtistTracks(
        user.id,
        artistId
      );

      res.json(artistTracksResponse);
    } catch (error: any) {
      console.error("Error fetching cached artist tracks:", error);
      res.status(500).json({ error: "Failed to fetch cached artist tracks" });
    }
  }
);

export { router as spotifyRouter };
