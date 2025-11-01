/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { SpotifyService } from "../services/index.js";

const router: Router = Router();

router.get("/playlists", requireAuth, async (req: Request, res: Response) => {
  try {
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

    const artists = Array.from(artistsWithCounts.values()).map(
      ({ artist, trackCount }) => ({
        ...artist,
        track_count: trackCount,
      })
    );

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

export { router as spotifyRouter };
