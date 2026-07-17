/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { RedisService, SpotifyService } from "../services";
import type { MusicSource } from "../services/RedisService";

const router: Router = Router();

function getRequestSource(req: Request): MusicSource {
  const source = (req as any).source as MusicSource | undefined;
  return source === "yt-music" ? "yt-music" : "spotify";
}

router.get("/playlists", requireAuth, async (req: Request, res: Response) => {
  try {
    if (getRequestSource(req) !== "spotify") {
      return res.status(400).json({ error: "Spotify session required" });
    }
    const spotifyService = new SpotifyService((req as any).accessToken);
    const userOwnedPlaylists = await spotifyService.getUserOwnedPlaylists();

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
      if (getRequestSource(req) !== "spotify") {
        return res.status(400).json({ error: "Spotify session required" });
      }
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
      if (getRequestSource(req) !== "spotify") {
        return res.status(400).json({ error: "Spotify session required" });
      }
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

router.post(
  "/playlists/:id/tracks",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      if (getRequestSource(req) !== "spotify") {
        return res.status(400).json({ error: "Spotify session required" });
      }
      const { trackId } = req.body;
      const playlistId = req.params.id;

      if (!trackId) {
        return res.status(400).json({ error: "Track ID is required" });
      }

      const spotifyService = new SpotifyService((req as any).accessToken);

      // Add to Spotify
      await spotifyService.addTrackToPlaylist(playlistId, trackId);

      // Update Redis cache
      const userId = (req as any).userId as string | undefined;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const track = await spotifyService.getTrack(trackId);

      const redisService = new RedisService(getRequestSource(req));
      await redisService.addTrackToPlaylist(userId, playlistId, track);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error adding track to playlist:", error);
      console.error("Spotify API error details:", error.response?.data);
      if (error.response?.status === 401) {
        return res.status(401).json({ error: "Token expired" });
      }
      if (error.response?.status === 403) {
        return res.status(403).json({
          error: "Permission denied",
          message:
            error.response?.data?.error?.message ||
            "You don't have permission to modify this playlist",
        });
      }
      res.status(500).json({ error: "Failed to add track to playlist" });
    }
  }
);

router.get("/artists", requireAuth, async (req: Request, res: Response) => {
  try {
    if (getRequestSource(req) !== "spotify") {
      return res.status(400).json({ error: "Spotify session required" });
    }
    const spotifyService = new SpotifyService((req as any).accessToken);
    const artistsWithCounts = await spotifyService.getArtistsFromSavedTracks();

    const artists = Array.from(artistsWithCounts.values())
      .sort((a, b) => b.trackCount - a.trackCount)
      .map(({ artist }) => artist);

    res.json({ artists });
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
      if (getRequestSource(req) !== "spotify") {
        return res.status(400).json({ error: "Spotify session required" });
      }
      const spotifyService = new SpotifyService((req as any).accessToken);
      const result = await spotifyService.getArtistTracksFromSavedTracks(
        artistId
      );

      const items = result.tracks.filter(
        (item) => item.track && !item.track.is_local
      );

      res.json({
        items,
        total: items.length,
        offset: 0,
        limit: items.length,
        next: null,
        previous: null,
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

export { router as spotifyRouter };
