/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { RedisService } from "../services";
import { BullService } from "../services/BullService";
import type { MusicSource } from "../services/RedisService";

const router: Router = Router();
const bullService = new BullService();

function getRequestSource(req: Request): MusicSource {
  const source = (req as any).source as MusicSource | undefined;
  return source === "yt-music" ? "yt-music" : "spotify";
}

router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const source = getRequestSource(req);
    const refreshToken =
      source === "spotify"
        ? (req.cookies?.spotify_refresh_token as string | undefined)
        : (req.cookies?.youtube_refresh_token as string | undefined);
    const userId = (req as any).userId as string | undefined;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const existingJobId = await bullService.getActiveJob(userId);

    if (existingJobId) {
      return res.json({
        success: true,
        message: "Persist job is already running",
        jobId: existingJobId,
        status: "active",
      });
    }

    const jobId = await bullService.startPersistJob(
      userId,
      (req as any).accessToken,
      refreshToken,
      source
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

router.get("/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const redisService = new RedisService(getRequestSource(req));
    const userId = (req as any).userId as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const meta = await redisService.getSyncMeta(userId);
    const hasData = !!meta?.lastSync;

    const activeJobId = await bullService.getActiveJob(userId);

    if (!activeJobId) {
      return res.json({
        success: true,
        hasActiveJob: false,
        hasData,
        lastSync: meta?.lastSync,
        stats: meta
          ? {
              playlists: meta.playlistCount,
              tracks: meta.trackCount,
              artists: meta.artistCount,
            }
          : undefined,
        message: "No active persist job found",
      });
    }

    const jobStatus = await bullService.getJobStatus(activeJobId);

    res.json({
      success: true,
      hasActiveJob: true,
      hasData,
      lastSync: meta?.lastSync,
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
});

router.delete("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const redisService = new RedisService(getRequestSource(req));
    const userId = (req as any).userId as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const activeJobId = await bullService.getActiveJob(userId);
    if (activeJobId) {
      return res.status(400).json({
        error: "Cannot delete data while sync is in progress",
      });
    }

    await redisService.deleteUserData(userId);

    res.json({
      success: true,
      message: "User data deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting user data:", error);
    if (error.response?.status === 401) {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(500).json({
      error: "Failed to delete user data",
      details: error.message,
    });
  }
});

export { router as persistRouter };
