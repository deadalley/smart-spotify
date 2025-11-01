/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { RedisService, SpotifyService } from "../services/index";

const router: Router = Router();
const redisService = new RedisService();

router.get("/playlists", requireAuth, async (req: Request, res: Response) => {
  try {
    const spotifyService = new SpotifyService((req as any).accessToken);

    const user = await spotifyService.getCurrentUser();
    const playlistsResponse = await redisService.getUserPlaylists(user.id);

    res.json(playlistsResponse);
  } catch (error: any) {
    console.error("Error fetching cached playlists:", error);
    res.status(500).json({ error: "Failed to fetch cached playlists" });
  }
});

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
  "/playlists/:id/tracks",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);

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

router.get("/artists", requireAuth, async (req: Request, res: Response) => {
  try {
    const spotifyService = new SpotifyService((req as any).accessToken);

    const user = await spotifyService.getCurrentUser();
    const artistsResponse = await redisService.getAllArtists(user.id);

    res.json(artistsResponse);
  } catch (error: any) {
    console.error("Error fetching cached artists:", error);
    res.status(500).json({ error: "Failed to fetch cached artists" });
  }
});

router.get(
  "/artists/:id/tracks",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);

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

export { router as indexRouter };
