/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { Request, Response, Router } from "express";
import { redisClient } from "../redis.js";

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

// New endpoint to persist all Spotify data to Redis
router.post("/persist", requireAuth, async (req: Request, res: Response) => {
  try {
    const accessToken = (req as any).accessToken;

    // Get user information first
    const userResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userId = userResponse.data.id;
    const userKey = `user:${userId}`;

    // Store user info
    await redisClient.hSet(userKey, {
      id: userId,
      display_name: userResponse.data.display_name || "",
      email: userResponse.data.email || "",
      country: userResponse.data.country || "",
      followers: userResponse.data.followers?.total || 0,
      images: JSON.stringify(userResponse.data.images || []),
      external_urls: JSON.stringify(userResponse.data.external_urls || {}),
    });

    // Fetch and persist playlists
    const allPlaylists: any[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(
        "https://api.spotify.com/v1/me/playlists",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { limit, offset },
        }
      );

      allPlaylists.push(...response.data.items);
      hasMore = response.data.next !== null;
      offset += limit;
    }

    // Filter user-owned playlists and store them
    const userOwnedPlaylists = allPlaylists.filter(
      (playlist) => playlist.owner.id === userId
    );

    for (const playlist of userOwnedPlaylists) {
      const playlistKey = `playlist:${playlist.id}`;

      // Store playlist metadata
      await redisClient.hSet(playlistKey, {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || "",
        owner_id: playlist.owner.id,
        public: playlist.public.toString(),
        collaborative: playlist.collaborative.toString(),
        tracks_total: playlist.tracks.total.toString(),
        images: JSON.stringify(playlist.images || []),
        external_urls: JSON.stringify(playlist.external_urls || {}),
        snapshot_id: playlist.snapshot_id || "",
      });

      // Add to user's playlists set
      await redisClient.sAdd(`${userKey}:playlists`, playlist.id);

      // Fetch and store playlist tracks
      let trackOffset = 0;
      const trackLimit = 100;
      let hasMoreTracks = true;
      const playlistTrackIds: string[] = [];

      while (hasMoreTracks) {
        const tracksResponse = await axios.get(
          `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { limit: trackLimit, offset: trackOffset },
          }
        );

        for (const item of tracksResponse.data.items) {
          if (item.track && !item.track.is_local) {
            const track = item.track;
            const trackKey = `track:${track.id}`;

            // Store track metadata
            await redisClient.hSet(trackKey, {
              id: track.id,
              name: track.name,
              duration_ms: track.duration_ms.toString(),
              explicit: track.explicit.toString(),
              popularity: track.popularity.toString(),
              preview_url: track.preview_url || "",
              track_number: track.track_number.toString(),
              disc_number: track.disc_number.toString(),
              album_id: track.album.id,
              album_name: track.album.name,
              album_type: track.album.album_type,
              album_release_date: track.album.release_date || "",
              album_images: JSON.stringify(track.album.images || []),
              external_urls: JSON.stringify(track.external_urls || {}),
              artist_ids: JSON.stringify(track.artists.map((a: any) => a.id)),
              artist_names: JSON.stringify(
                track.artists.map((a: any) => a.name)
              ),
            });

            playlistTrackIds.push(track.id);

            // Store track-playlist relationship
            await redisClient.sAdd(`${trackKey}:playlists`, playlist.id);

            // Store and process artists
            for (const artist of track.artists) {
              const artistKey = `artist:${artist.id}`;

              // Store basic artist info (will be enriched later)
              await redisClient.hSet(artistKey, {
                id: artist.id,
                name: artist.name,
                external_urls: JSON.stringify(artist.external_urls || {}),
              });

              // Store artist-track relationship
              await redisClient.sAdd(`${artistKey}:tracks`, track.id);

              // Store artist-playlist relationship
              await redisClient.sAdd(`${artistKey}:playlists`, playlist.id);

              // Store track-artist relationship
              await redisClient.sAdd(`${trackKey}:artists`, artist.id);
            }

            // Store album info
            const albumKey = `album:${track.album.id}`;
            await redisClient.hSet(albumKey, {
              id: track.album.id,
              name: track.album.name,
              album_type: track.album.album_type,
              release_date: track.album.release_date || "",
              total_tracks: track.album.total_tracks?.toString() || "0",
              images: JSON.stringify(track.album.images || []),
              external_urls: JSON.stringify(track.album.external_urls || {}),
              artist_ids: JSON.stringify(
                track.album.artists?.map((a: any) => a.id) || []
              ),
            });

            // Store album-track relationship
            await redisClient.sAdd(`${albumKey}:tracks`, track.id);
          }
        }

        hasMoreTracks = tracksResponse.data.next !== null;
        trackOffset += trackLimit;
      }

      // Store playlist tracks as an ordered list
      if (playlistTrackIds.length > 0) {
        await redisClient.del(`${playlistKey}:tracks`);
        await redisClient.lPush(
          `${playlistKey}:tracks`,
          playlistTrackIds.reverse()
        );
      }
    }

    // Fetch and enrich artist information
    const artistIds = await redisClient.keys("artist:*");
    const uniqueArtistIds = artistIds.map((key) => key.split(":")[1]);

    // Process artists in batches to get detailed info
    const batchSize = 50;
    for (let i = 0; i < uniqueArtistIds.length; i += batchSize) {
      const batch = uniqueArtistIds.slice(i, i + batchSize);
      const artistIdsString = batch.join(",");

      try {
        const artistsResponse = await axios.get(
          `https://api.spotify.com/v1/artists?ids=${artistIdsString}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        for (const artist of artistsResponse.data.artists) {
          if (artist) {
            const artistKey = `artist:${artist.id}`;

            // Update artist with detailed info
            await redisClient.hSet(artistKey, {
              id: artist.id,
              name: artist.name,
              popularity: artist.popularity?.toString() || "0",
              followers: artist.followers?.total?.toString() || "0",
              genres: JSON.stringify(artist.genres || []),
              images: JSON.stringify(artist.images || []),
              external_urls: JSON.stringify(artist.external_urls || {}),
            });
          }
        }
      } catch (error) {
        console.error("Error fetching artist details for batch:", error);
      }
    }

    // Store metadata about the sync
    await redisClient.hSet(`${userKey}:sync_metadata`, {
      last_sync: new Date().toISOString(),
      playlists_count: userOwnedPlaylists.length.toString(),
      tracks_count: (await redisClient.keys("track:*")).length.toString(),
      artists_count: uniqueArtistIds.length.toString(),
    });

    res.json({
      success: true,
      message: "Spotify data successfully persisted to Redis",
      stats: {
        playlists: userOwnedPlaylists.length,
        tracks: await redisClient.keys("track:*").then((keys) => keys.length),
        artists: uniqueArtistIds.length,
        user_id: userId,
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
    const userResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${(req as any).accessToken}` },
    });
    const userId = userResponse.data.id;
    const userKey = `user:${userId}`;

    const syncMetadata = await redisClient.hGetAll(`${userKey}:sync_metadata`);

    if (Object.keys(syncMetadata).length === 0) {
      return res.json({ synced: false, message: "No data found in Redis" });
    }

    res.json({
      synced: true,
      last_sync: syncMetadata.last_sync,
      stats: {
        playlists: parseInt(syncMetadata.playlists_count || "0"),
        tracks: parseInt(syncMetadata.tracks_count || "0"),
        artists: parseInt(syncMetadata.artists_count || "0"),
      },
    });
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
      const userResponse = await axios.get("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${(req as any).accessToken}` },
      });
      const userId = userResponse.data.id;
      const userKey = `user:${userId}`;

      const playlistIds = await redisClient.sMembers(`${userKey}:playlists`);
      const playlists = [];

      for (const playlistId of playlistIds) {
        const playlistData = await redisClient.hGetAll(
          `playlist:${playlistId}`
        );
        if (Object.keys(playlistData).length > 0) {
          playlists.push({
            id: playlistData.id,
            name: playlistData.name,
            description: playlistData.description,
            public: playlistData.public === "true",
            collaborative: playlistData.collaborative === "true",
            tracks: { total: parseInt(playlistData.tracks_total || "0") },
            images: JSON.parse(playlistData.images || "[]"),
            external_urls: JSON.parse(playlistData.external_urls || "{}"),
            snapshot_id: playlistData.snapshot_id,
            owner: { id: playlistData.owner_id },
          });
        }
      }

      res.json({
        items: playlists,
        total: playlists.length,
      });
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
      const playlistId = req.params.id;
      const playlistKey = `playlist:${playlistId}`;

      const trackIds = await redisClient.lRange(`${playlistKey}:tracks`, 0, -1);
      const tracks = [];

      for (const trackId of trackIds) {
        const trackData = await redisClient.hGetAll(`track:${trackId}`);
        if (Object.keys(trackData).length > 0) {
          tracks.push({
            track: {
              id: trackData.id,
              name: trackData.name,
              duration_ms: parseInt(trackData.duration_ms || "0"),
              explicit: trackData.explicit === "true",
              popularity: parseInt(trackData.popularity || "0"),
              preview_url: trackData.preview_url || null,
              track_number: parseInt(trackData.track_number || "0"),
              disc_number: parseInt(trackData.disc_number || "0"),
              external_urls: JSON.parse(trackData.external_urls || "{}"),
              artists: JSON.parse(trackData.artist_names || "[]").map(
                (name: string, index: number) => ({
                  id: JSON.parse(trackData.artist_ids || "[]")[index],
                  name: name,
                })
              ),
              album: {
                id: trackData.album_id,
                name: trackData.album_name,
                album_type: trackData.album_type,
                release_date: trackData.album_release_date,
                images: JSON.parse(trackData.album_images || "[]"),
              },
            },
          });
        }
      }

      res.json({
        items: tracks,
        total: tracks.length,
      });
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
      const artistKeys = await redisClient.keys("artist:*");
      const artists = [];

      for (const artistKey of artistKeys) {
        const artistData = await redisClient.hGetAll(artistKey);
        if (Object.keys(artistData).length > 0) {
          const trackCount = await redisClient.sCard(`${artistKey}:tracks`);

          artists.push({
            id: artistData.id,
            name: artistData.name,
            popularity: parseInt(artistData.popularity || "0"),
            followers: { total: parseInt(artistData.followers || "0") },
            genres: JSON.parse(artistData.genres || "[]"),
            images: JSON.parse(artistData.images || "[]"),
            external_urls: JSON.parse(artistData.external_urls || "{}"),
            track_count: trackCount,
          });
        }
      }

      // Sort by track count (most popular first)
      artists.sort((a, b) => b.track_count - a.track_count);

      res.json({
        items: artists,
        total: artists.length,
      });
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
      const artistId = req.params.id;
      const artistKey = `artist:${artistId}`;

      const artistData = await redisClient.hGetAll(artistKey);
      const trackIds = await redisClient.sMembers(`${artistKey}:tracks`);
      const tracks = [];

      for (const trackId of trackIds) {
        const trackData = await redisClient.hGetAll(`track:${trackId}`);
        if (Object.keys(trackData).length > 0) {
          tracks.push({
            track: {
              id: trackData.id,
              name: trackData.name,
              duration_ms: parseInt(trackData.duration_ms || "0"),
              explicit: trackData.explicit === "true",
              popularity: parseInt(trackData.popularity || "0"),
              preview_url: trackData.preview_url || null,
              external_urls: JSON.parse(trackData.external_urls || "{}"),
              artists: JSON.parse(trackData.artist_names || "[]").map(
                (name: string, index: number) => ({
                  id: JSON.parse(trackData.artist_ids || "[]")[index],
                  name: name,
                })
              ),
              album: {
                id: trackData.album_id,
                name: trackData.album_name,
                album_type: trackData.album_type,
                release_date: trackData.album_release_date,
                images: JSON.parse(trackData.album_images || "[]"),
              },
            },
          });
        }
      }

      res.json({
        artist:
          Object.keys(artistData).length > 0
            ? {
                id: artistData.id,
                name: artistData.name,
                popularity: parseInt(artistData.popularity || "0"),
                followers: { total: parseInt(artistData.followers || "0") },
                genres: JSON.parse(artistData.genres || "[]"),
                images: JSON.parse(artistData.images || "[]"),
                external_urls: JSON.parse(artistData.external_urls || "{}"),
              }
            : null,
        tracks: {
          items: tracks,
          total: tracks.length,
        },
      });
    } catch (error: any) {
      console.error("Error fetching cached artist tracks:", error);
      res.status(500).json({ error: "Failed to fetch cached artist tracks" });
    }
  }
);

export { router as spotifyRouter };
