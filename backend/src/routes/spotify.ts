/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, Router } from "express";
import { BullService } from "../services/BullService.js";
import { RedisService, SpotifyService } from "../services/index.js";

const router: Router = Router();
const bullService = new BullService();

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

// New endpoint to start persist job
router.post("/persist", requireAuth, async (req: Request, res: Response) => {
  try {
    const spotifyService = new SpotifyService((req as any).accessToken);
    const user = await spotifyService.getCurrentUser();

    // Check if there's already an active job for this user
    const existingJobId = await bullService.getUserActiveJob(user.id);

    if (existingJobId) {
      return res.json({
        success: true,
        message: "Persist job is already running",
        jobId: existingJobId,
        status: "active",
      });
    }

    // Start a new persist job
    const jobId = await bullService.startPersistJob(
      user.id,
      (req as any).accessToken
    );

    res.json({
      success: true,
      message: "Persist job started successfully",
      jobId: jobId,
      status: "started",
    });
  } catch (error: any) {
    console.error("Error starting persist job:", error);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(500).json({
      error: "Failed to start persist job",
      details: error.message,
    });
  }
});

// Endpoint to poll persist job status
router.get(
  "/persist/status/:jobId",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const jobId = req.params.jobId;
      const jobStatus = await bullService.getJobStatus(jobId);

      if (!jobStatus) {
        return res.status(404).json({
          error: "Job not found",
          jobId: jobId,
        });
      }

      res.json({
        success: true,
        jobId: jobId,
        ...jobStatus,
      });
    } catch (error: any) {
      console.error("Error getting job status:", error);
      res.status(500).json({
        error: "Failed to get job status",
        details: error.message,
      });
    }
  }
);

// Endpoint to get current user's active persist job
router.get(
  "/persist/status",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const user = await spotifyService.getCurrentUser();

      const activeJobId = await bullService.getUserActiveJob(user.id);

      if (!activeJobId) {
        return res.json({
          success: true,
          hasActiveJob: false,
          message: "No active persist job found",
        });
      }

      const jobStatus = await bullService.getJobStatus(activeJobId);

      res.json({
        success: true,
        hasActiveJob: true,
        jobId: activeJobId,
        ...jobStatus,
      });
    } catch (error: any) {
      console.error("Error getting active job status:", error);
      if (error.response?.status === 401) {
        return res.status(401).json({ error: "Token expired" });
      }
      res.status(500).json({
        error: "Failed to get active job status",
        details: error.message,
      });
    }
  }
);

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
