/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { PlaylistService, RedisService, SpotifyService } from "../services";

const router: Router = Router();
const redisService = new RedisService();
const playlistService = new PlaylistService(redisService);

router.get("/tracks", requireAuth, async (req: Request, res: Response) => {
  try {
    const spotifyService = new SpotifyService((req as any).accessToken);
    const user = await spotifyService.getCurrentUser();

    const tracksResponse = await redisService.getUserTracks(user.id);

    res.json(tracksResponse);
  } catch (error: any) {
    console.error("Error fetching cached tracks:", error);
    res.status(500).json({ error: "Failed to fetch cached tracks" });
  }
});

router.get(
  "/tracks/saved",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const user = await spotifyService.getCurrentUser();

      // Get saved tracks from Redis (stored as "liked-songs" playlist)
      const savedTracks = await redisService.getPlaylistTracks(
        user.id,
        "liked-songs"
      );

      res.json(savedTracks);
    } catch (error: any) {
      console.error("Error fetching saved tracks:", error);
      res.status(500).json({ error: "Failed to fetch saved tracks" });
    }
  }
);

router.get("/playlists", requireAuth, async (req: Request, res: Response) => {
  try {
    const spotifyService = new SpotifyService((req as any).accessToken);
    const user = await spotifyService.getCurrentUser();

    const playlistsResponse = (
      await redisService.getUserPlaylists(user.id)
    ).filter((p) => p.id !== "liked-songs");

    res.json(playlistsResponse);
  } catch (error: any) {
    console.error("Error fetching cached playlists:", error);
    res.status(500).json({ error: "Failed to fetch cached playlists" });
  }
});

router.get(
  "/playlists/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const user = await spotifyService.getCurrentUser();

      const playlistId = req.params.id;

      const playlistResponse = await redisService.getPlaylist(
        user.id,
        playlistId
      );

      res.json(playlistResponse);
    } catch (error: any) {
      console.error("Error fetching cached playlist tracks:", error);
      res.status(500).json({ error: "Failed to fetch cached playlist tracks" });
    }
  }
);

router.get(
  "/playlists/:id/tracks",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const user = await spotifyService.getCurrentUser();

      const playlistId = req.params.id;

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

router.get("/artists", requireAuth, async (req: Request, res: Response) => {
  try {
    const spotifyService = new SpotifyService((req as any).accessToken);
    const user = await spotifyService.getCurrentUser();

    const artistsResponse = await redisService.getUserArtists(user.id);

    res.json(artistsResponse);
  } catch (error: any) {
    console.error("Error fetching cached artists:", error);
    res.status(500).json({ error: "Failed to fetch cached artists" });
  }
});

router.get("/artists/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const spotifyService = new SpotifyService((req as any).accessToken);
    const user = await spotifyService.getCurrentUser();

    const artistId = req.params.id;

    const artistResponse = await redisService.getArtist(user.id, artistId);

    res.json(artistResponse);
  } catch (error: any) {
    console.error("Error fetching cached artist tracks:", error);
    res.status(500).json({ error: "Failed to fetch cached artist tracks" });
  }
});

router.get(
  "/artists/:id/tracks",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const user = await spotifyService.getCurrentUser();

      const artistId = req.params.id;

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

router.get(
  "/playlists/:id/analyze",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const user = await spotifyService.getCurrentUser();

      const playlistId = req.params.id;

      const playlistAnalysis = await playlistService.analyzePlaylist(
        user.id,
        playlistId
      );

      res.json(playlistAnalysis);
    } catch (error: any) {
      console.error("Error analyzing playlist:", error);
      res.status(500).json({ error: "Failed to analyze playlist" });
    }
  }
);

router.get(
  "/playlists/aggregate",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const user = await spotifyService.getCurrentUser();

      const aggregatedPlaylists = await playlistService.aggregatePlaylists(
        user.id
      );

      res.json(aggregatedPlaylists);
    } catch (error: any) {
      console.error("Error fetching aggregated playlists:", error);
      res.status(500).json({ error: "Failed to fetch aggregated playlists" });
    }
  }
);

router.get(
  "/tracks/aggregate",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const user = await spotifyService.getCurrentUser();

      const aggregatedLikedSongs = await playlistService.aggregateLikedSongs(
        user.id
      );

      res.json(aggregatedLikedSongs);
    } catch (error: any) {
      console.error("Error fetching aggregated liked songs:", error);
      res.status(500).json({ error: "Failed to fetch aggregated liked songs" });
    }
  }
);

export { router as indexRouter };
