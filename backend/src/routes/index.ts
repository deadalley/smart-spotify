/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  convertFromSpotifyAlbum,
  convertFromSpotifyTrack,
  PlaylistAnalysisResult,
  SpotifyTrack,
} from "@smart-spotify/shared";
import { Request, Response, Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { PlaylistService, RedisService, SpotifyService } from "../services";

const router: Router = Router();
const redisService = new RedisService();
const playlistService = new PlaylistService(redisService);

router.get("/tracks", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string | undefined;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const tracksResponse = await redisService.getUserTracks(userId);

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
      const userId = (req as any).userId as string | undefined;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      // Get saved tracks from Redis (stored as "liked-songs" playlist)
      const savedTracks = await redisService.getPlaylistTracks(
        userId,
        "liked-songs"
      );

      res.json(savedTracks);
    } catch (error: any) {
      console.error("Error fetching saved tracks:", error);
      res.status(500).json({ error: "Failed to fetch saved tracks" });
    }
  }
);

router.delete(
  "/tracks/saved/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const userId = (req as any).userId as string | undefined;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const trackId = req.params.id;

      // Remove from Spotify
      await spotifyService.removeTrackFromSaved(trackId);

      // Remove from Redis cache
      await redisService.removeTrackFromPlaylist(
        userId,
        "liked-songs",
        trackId
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing track from saved:", error);
      if (error.response?.status === 401) {
        return res.status(401).json({ error: "Token expired" });
      }
      res.status(500).json({ error: "Failed to remove track from saved" });
    }
  }
);

router.get("/playlists", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string | undefined;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const playlistsResponse = (
      await redisService.getUserPlaylists(userId)
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
      const userId = (req as any).userId as string | undefined;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const playlistId = req.params.id;

      const playlistResponse = await redisService.getPlaylist(
        userId,
        playlistId
      );

      if (!playlistResponse) {
        return res.status(404).json({ error: "Playlist not found" });
      }

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
      const userId = (req as any).userId as string | undefined;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const playlistId = req.params.id;

      const tracksResponse = await redisService.getPlaylistTracks(
        userId,
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
    const userId = (req as any).userId as string | undefined;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const artistsResponse = await redisService.getUserArtists(userId);

    res.json(artistsResponse);
  } catch (error: any) {
    console.error("Error fetching cached artists:", error);
    res.status(500).json({ error: "Failed to fetch cached artists" });
  }
});

router.get("/artists/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string | undefined;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const artistId = req.params.id;

    const artistResponse = await redisService.getArtist(userId, artistId);

    if (!artistResponse) {
      return res.status(404).json({ error: "Artist not found" });
    }

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
      const userId = (req as any).userId as string | undefined;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const artistId = req.params.id;

      const artistTracksResponse = await redisService.getArtistTracks(
        userId,
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
      const userId = (req as any).userId as string | undefined;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const playlistId = req.params.id;

      const playlistAnalysis = await redisService.getPlaylistData(
        userId,
        playlistId
      );

      if (!playlistAnalysis) {
        return res.status(404).json({ error: "Playlist not found" });
      }

      const consistencyAnalysis = playlistService.calculatePlaylistConsistency(
        playlistAnalysis.artists,
        playlistAnalysis.genres,
        playlistAnalysis.tracks.length,
        playlistAnalysis.tracks
      );

      const analysis: PlaylistAnalysisResult = {
        ...playlistAnalysis,
        consistencyAnalysis,
      };

      res.json(analysis);
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
      const userId = (req as any).userId as string | undefined;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const aggregatedPlaylists = await playlistService.aggregatePlaylists(
        userId
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
      const userId = (req as any).userId as string | undefined;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const aggregatedLikedSongs = await playlistService.aggregateLikedSongs(
        userId
      );

      res.json(aggregatedLikedSongs);
    } catch (error: any) {
      console.error("Error fetching aggregated liked songs:", error);
      res.status(500).json({ error: "Failed to fetch aggregated liked songs" });
    }
  }
);

router.get("/albums/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const spotifyService = new SpotifyService((req as any).accessToken);
    const album = await spotifyService.getAlbum(req.params.id);
    res.json(convertFromSpotifyAlbum(album));
  } catch (error: any) {
    console.error("Error fetching album:", error);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(500).json({ error: "Failed to fetch album" });
  }
});

router.get(
  "/albums/:id/tracks",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const spotifyService = new SpotifyService((req as any).accessToken);
      const [album, albumTracks] = await Promise.all([
        spotifyService.getAlbum(req.params.id),
        spotifyService.getAlbumTracks(req.params.id),
      ]);

      // Album tracks endpoint returns simplified tracks; enrich with album + default popularity.
      const tracks = albumTracks.map((t) => {
        const enriched: SpotifyTrack = {
          ...(t as Omit<SpotifyTrack, "album" | "popularity">),
          album,
          popularity: (t as any).popularity ?? 0,
        };

        return convertFromSpotifyTrack(enriched);
      });

      res.json(tracks);
    } catch (error: any) {
      console.error("Error fetching album tracks:", error);
      if (error.response?.status === 401) {
        return res.status(401).json({ error: "Token expired" });
      }
      res.status(500).json({ error: "Failed to fetch album tracks" });
    }
  }
);

router.patch(
  "/playlists/:id/type",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId as string | undefined;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const playlistId = req.params.id;
      const { playlistType } = req.body;

      if (!playlistType) {
        return res.status(400).json({ error: "playlistType is required" });
      }

      // Validate playlist type
      const validTypes = ["mood", "genre", "collection", "artist", "other"];
      if (!validTypes.includes(playlistType)) {
        return res.status(400).json({
          error: "Invalid playlist type",
          validTypes,
        });
      }

      await redisService.updatePlaylistType(userId, playlistId, playlistType);

      res.json({ success: true, playlistType });
    } catch (error: any) {
      console.error("Error updating playlist type:", error);
      res.status(500).json({ error: "Failed to update playlist type" });
    }
  }
);

export { router as indexRouter };
