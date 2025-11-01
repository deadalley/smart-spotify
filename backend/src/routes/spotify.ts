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
      // Fetch playlist tracks
      const allTracks: any[] = [];
      let offset = 0;
      const limit = 100;
      let hasMoreTracks = true;

      while (hasMoreTracks) {
        const response = await axios.get(
          `https://api.spotify.com/v1/playlists/${req.params.id}/tracks`,
          {
            headers: {
              Authorization: `Bearer ${(req as any).accessToken}`,
            },
            params: { limit, offset },
          }
        );

        allTracks.push(...response.data.items);
        hasMoreTracks = response.data.next !== null;
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

router.get("/artists", requireAuth, async (req: Request, res: Response) => {
  try {
    const allTracks: any[] = [];
    let offset = 0;
    const limit = 50; // Maximum allowed by Spotify API for saved tracks
    let hasMore = true;

    // Fetch all saved tracks from user's library
    while (hasMore) {
      const response = await axios.get("https://api.spotify.com/v1/me/tracks", {
        headers: {
          Authorization: `Bearer ${(req as any).accessToken}`,
        },
        params: {
          limit,
          offset,
        },
      });

      const data = response.data;
      allTracks.push(...data.items);

      hasMore = data.next !== null;
      offset += limit;
    }

    // Extract unique artists from all tracks
    const artistsMap = new Map();

    allTracks.forEach((item: any) => {
      if (item.track && item.track.artists) {
        item.track.artists.forEach((artist: any) => {
          if (!artistsMap.has(artist.id)) {
            artistsMap.set(artist.id, {
              id: artist.id,
              name: artist.name,
              external_urls: artist.external_urls,
              track_count: 1,
            });
          } else {
            const existingArtist = artistsMap.get(artist.id);
            existingArtist.track_count += 1;
            artistsMap.set(artist.id, existingArtist);
          }
        });
      }
    });

    // Convert Map to array and sort by track count (most popular first)
    let uniqueArtists = Array.from(artistsMap.values()).sort(
      (a, b) => b.track_count - a.track_count
    );

    // Fetch detailed artist information including images in batches
    const artistsWithImages = [];
    const batchSize = 50; // Spotify allows up to 50 artists per request

    for (let i = 0; i < uniqueArtists.length; i += batchSize) {
      const batch = uniqueArtists.slice(i, i + batchSize);
      const artistIds = batch.map((artist) => artist.id).join(",");

      try {
        const artistsResponse = await axios.get(
          `https://api.spotify.com/v1/artists?ids=${artistIds}`,
          {
            headers: {
              Authorization: `Bearer ${(req as any).accessToken}`,
            },
          }
        );

        // Merge the detailed artist data with our track count data
        const detailedArtists = artistsResponse.data.artists.map(
          (detailedArtist: any) => {
            const originalArtist = batch.find(
              (a) => a.id === detailedArtist.id
            );
            return {
              id: detailedArtist.id,
              name: detailedArtist.name,
              external_urls: detailedArtist.external_urls,
              images: detailedArtist.images || [],
              followers: detailedArtist.followers,
              genres: detailedArtist.genres || [],
              popularity: detailedArtist.popularity || 0,
              track_count: originalArtist?.track_count || 0,
            };
          }
        );

        artistsWithImages.push(...detailedArtists);
      } catch (error) {
        console.error("Error fetching artist details for batch:", error);
        // If fetching detailed info fails, fall back to basic info
        artistsWithImages.push(
          ...batch.map((artist) => ({
            ...artist,
            images: [],
            followers: { total: 0 },
            genres: [],
            popularity: 0,
          }))
        );
      }
    }

    // Sort again by track count since batching might have changed the order
    uniqueArtists = artistsWithImages.sort(
      (a, b) => b.track_count - a.track_count
    );

    res.json({
      items: uniqueArtists,
      total: uniqueArtists.length,
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
      // Fetch all saved tracks and artist details in parallel
      const [savedTracksResult, artistResult] = await Promise.allSettled([
        // Fetch all saved tracks
        (async () => {
          const allTracks: any[] = [];
          let offset = 0;
          const limit = 50;
          let hasMore = true;

          while (hasMore) {
            const response = await axios.get(
              "https://api.spotify.com/v1/me/tracks",
              {
                headers: {
                  Authorization: `Bearer ${(req as any).accessToken}`,
                },
                params: { limit, offset },
              }
            );

            allTracks.push(...response.data.items);
            hasMore = response.data.next !== null;
            offset += limit;
          }
          return allTracks;
        })(),

        // Get artist details
        axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
          headers: { Authorization: `Bearer ${(req as any).accessToken}` },
        }),
      ]);

      const allTracks =
        savedTracksResult.status === "fulfilled" ? savedTracksResult.value : [];
      const artistInfo =
        artistResult.status === "fulfilled" ? artistResult.value.data : null;

      // Filter tracks by the specific artist
      const artistTracks = allTracks.filter((item: any) => {
        if (item.track && item.track.artists) {
          return item.track.artists.some(
            (artist: any) => artist.id === artistId
          );
        }
        return false;
      });

      res.json({
        artist: artistInfo,
        tracks: {
          items: artistTracks,
          total: artistTracks.length,
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
