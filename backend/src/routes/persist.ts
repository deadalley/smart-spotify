/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { RedisService, SpotifyService } from "../services";
import { BullService } from "../services/BullService";

const router: Router = Router();
const bullService = new BullService();
const redisService = new RedisService();

router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const spotifyService = new SpotifyService((req as any).accessToken);
    const user = await spotifyService.getCurrentUser();
    const refreshToken = req.cookies?.spotify_refresh_token as string | undefined;

    const existingJobId = await bullService.getActiveJob(user.id);

    if (existingJobId) {
      return res.json({
        success: true,
        message: "Persist job is already running",
        jobId: existingJobId,
        status: "active",
      });
    }

    const jobId = await bullService.startPersistJob(
      user.id,
      (req as any).accessToken,
      refreshToken
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
    const spotifyService = new SpotifyService((req as any).accessToken);
    const user = await spotifyService.getCurrentUser();

    const activeJobId = await bullService.getActiveJob(user.id);

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
});

router.delete("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const spotifyService = new SpotifyService((req as any).accessToken);
    const user = await spotifyService.getCurrentUser();

    const activeJobId = await bullService.getActiveJob(user.id);
    if (activeJobId) {
      return res.status(400).json({
        error: "Cannot delete data while sync is in progress",
      });
    }

    await redisService.deleteUserData(user.id);

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
