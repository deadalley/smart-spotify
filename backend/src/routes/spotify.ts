/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { Request, Response, Router } from "express";

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
    // First, get the current user information to get their ID
    const userResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${(req as any).accessToken}`,
      },
    });
    const userId = userResponse.data.id;

    const allPlaylists: any[] = [];
    let offset = 0;
    const limit = 50; // Maximum allowed by Spotify API for playlists
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(
        "https://api.spotify.com/v1/me/playlists",
        {
          headers: {
            Authorization: `Bearer ${(req as any).accessToken}`,
          },
          params: {
            limit,
            offset,
          },
        }
      );

      const data = response.data;
      allPlaylists.push(...data.items);

      // Check if there are more playlists to fetch
      hasMore = data.next !== null;
      offset += limit;
    }

    // Filter to only include playlists owned by the current user
    const userOwnedPlaylists = allPlaylists.filter(
      (playlist) => playlist.owner.id === userId
    );

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
      const response = await axios.get(
        `https://api.spotify.com/v1/playlists/${req.params.id}`,
        {
          headers: {
            Authorization: `Bearer ${(req as any).accessToken}`,
          },
        }
      );

      res.json(response.data);
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
      const allTracks: any[] = [];
      let offset = 0;
      const limit = 100; // Maximum allowed by Spotify API
      let hasMoreTracks = true;

      while (hasMoreTracks) {
        const response = await axios.get(
          `https://api.spotify.com/v1/playlists/${req.params.id}/tracks`,
          {
            headers: {
              Authorization: `Bearer ${(req as any).accessToken}`,
            },
            params: {
              limit,
              offset,
            },
          }
        );

        const data = response.data;
        allTracks.push(...data.items);

        hasMoreTracks = data.next !== null;
        offset += limit;
      }

      res.json({
        items: allTracks,
        total: allTracks.length,
        offset: 0,
        limit: allTracks.length,
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
    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${(req as any).accessToken}`,
      },
      params: {
        q,
        type,
        limit,
        market: "from_token",
      },
    });

    res.json(response.data);
  } catch (error: any) {
    console.error("Error searching tracks:", error);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(500).json({ error: "Failed to search tracks" });
  }
});

export { router as spotifyRouter };
