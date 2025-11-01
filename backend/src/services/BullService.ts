import { Job, Queue, Worker } from "bullmq";
import { RedisService } from "./RedisService.js";
import { SpotifyService } from "./SpotifyService.js";

export interface PersistJobData {
  userId: string;
  accessToken: string;
}

export enum JobStatus {
  WAITING = "waiting",
  ACTIVE = "active",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface JobProgress {
  status: JobStatus;
  progress: number;
  message: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  stats?: {
    playlists: number;
    tracks: number;
    artists: number;
  };
}

export class BullService {
  private persistQueue: Queue;
  private persistWorker: Worker;

  constructor() {
    // Create the queue for persist jobs
    this.persistQueue = new Queue("persist-spotify-data", {
      connection: {
        host: "localhost",
        port: 6379,
      },
    });

    // Create the worker to process persist jobs
    this.persistWorker = new Worker(
      "persist-spotify-data",
      async (job: Job<PersistJobData>) => {
        return this.processPersistJob(job);
      },
      {
        connection: {
          host: "localhost",
          port: 6379,
        },
        concurrency: 1, // Process one persist job at a time
      }
    );

    // Set up worker event listeners
    this.setupWorkerListeners();
  }

  private setupWorkerListeners(): void {
    this.persistWorker.on("completed", (job) => {
      console.log(
        `Persist job ${job.id} completed for user ${job.data.userId}`
      );
    });

    this.persistWorker.on("failed", (job, err) => {
      console.error(
        `Persist job ${job?.id} failed for user ${job?.data?.userId}:`,
        err
      );
    });

    this.persistWorker.on("progress", (job, progress) => {
      console.log(`Persist job ${job.id} progress: ${progress}%`);
    });
  }

  private async processPersistJob(job: Job<PersistJobData>): Promise<void> {
    const { userId, accessToken } = job.data;

    try {
      const spotifyService = new SpotifyService(accessToken);
      const redisService = new RedisService();

      // Update job progress
      await job.updateProgress(0);

      // Get user info and store it
      const user = await spotifyService.getCurrentUser();
      await redisService.storeUser(user);
      await job.updateProgress(10);

      // Get all user-owned playlists (SpotifyService handles pagination internally)
      const allPlaylists = await spotifyService.getUserOwnedPlaylists();
      await job.updateProgress(30);

      // Store playlists in Redis
      await redisService.storePlaylists(userId, allPlaylists);
      await job.updateProgress(30);

      // Process each playlist's tracks
      let allTracks: any[] = [];
      let allArtistIds = new Set<string>();

      for (let i = 0; i < allPlaylists.length; i++) {
        const playlist = allPlaylists[i];

        // Get all tracks for this playlist (SpotifyService handles pagination internally)
        const playlistTracks = await spotifyService.getPlaylistTracks(
          playlist.id
        );

        // Filter out null tracks and local tracks
        const validTracks = playlistTracks.filter(
          (item: any) => item.track && !item.track.is_local
        );

        // Store tracks for this playlist
        if (validTracks.length > 0) {
          await redisService.storeTracks(userId, playlist.id, validTracks);
          await redisService.storeAlbums(userId, validTracks);

          allTracks = allTracks.concat(validTracks);

          // Collect artist IDs
          validTracks.forEach((item: any) => {
            if (item.track && item.track.artists) {
              item.track.artists.forEach((artist: any) => {
                allArtistIds.add(artist.id);
                // Store basic artist info from track data
                redisService.storeBasicArtist(
                  userId,
                  artist.id,
                  artist.name,
                  artist.external_urls
                );
              });
            }
          });
        }

        // Update progress for track processing (30-80%)
        const trackProgress = 30 + ((i + 1) / allPlaylists.length) * 50;
        await job.updateProgress(Math.round(trackProgress));
      }

      // Get detailed artist information in batches
      const artistIds = Array.from(allArtistIds);
      const batchSize = 50;
      let detailedArtists: any[] = [];

      for (let i = 0; i < artistIds.length; i += batchSize) {
        const batch = artistIds.slice(i, i + batchSize);
        try {
          const artistsResponse = await spotifyService.getArtists(batch);
          detailedArtists = detailedArtists.concat(artistsResponse);
        } catch (error) {
          console.warn(
            `Failed to fetch artist batch ${i}-${i + batch.length}:`,
            error
          );
        }

        // Update progress for artist processing (80-95%)
        const artistProgress = 80 + ((i + batchSize) / artistIds.length) * 15;
        await job.updateProgress(Math.round(Math.min(95, artistProgress)));
      }

      // Store detailed artist information
      if (detailedArtists.length > 0) {
        await redisService.storeArtists(userId, detailedArtists);
      }

      // Store sync metadata
      await redisService.storeSyncMetadata(userId, {
        playlists: allPlaylists.length,
        tracks: allTracks.length,
        artists: detailedArtists.length,
      });

      await job.updateProgress(100);

      console.log(
        `Data persistence completed for user ${userId}: ${allPlaylists.length} playlists, ${allTracks.length} tracks, ${detailedArtists.length} artists`
      );
    } catch (error: any) {
      console.error("Error in persist job:", error);
      throw new Error(`Persist job failed: ${error.message}`);
    }
  }

  async startPersistJob(userId: string, accessToken: string): Promise<string> {
    // Check if there's already an active job for this user
    const activeJobs = await this.persistQueue.getJobs(["waiting", "active"]);
    const existingJob = activeJobs.find((job) => job.data.userId === userId);

    if (existingJob) {
      return existingJob.id!;
    }

    // Create a new job
    const job = await this.persistQueue.add(
      "persist-data",
      { userId, accessToken },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 5, // Keep last 5 failed jobs
      }
    );

    return job.id!;
  }

  async getJobStatus(jobId: string): Promise<JobProgress | null> {
    try {
      const job = await this.persistQueue.getJob(jobId);

      if (!job) {
        return null;
      }

      const state = await job.getState();
      let status: JobStatus;

      switch (state) {
        case "waiting":
          status = JobStatus.WAITING;
          break;
        case "active":
          status = JobStatus.ACTIVE;
          break;
        case "completed":
          status = JobStatus.COMPLETED;
          break;
        case "failed":
          status = JobStatus.FAILED;
          break;
        default:
          status = JobStatus.WAITING;
      }

      const progress: JobProgress = {
        status,
        progress: (job.progress as number) || 0,
        message: this.getStatusMessage(status, (job.progress as number) || 0),
        startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
        completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      };

      if (status === JobStatus.FAILED && job.failedReason) {
        progress.error = job.failedReason;
      }

      if (status === JobStatus.COMPLETED && job.returnvalue) {
        // Try to get stats from Redis
        const redisService = new RedisService();
        const syncStatus = await redisService.getSyncStatus(job.data.userId);
        if (syncStatus.synced && syncStatus.stats) {
          progress.stats = syncStatus.stats;
        }
      }

      return progress;
    } catch (error) {
      console.error("Error getting job status:", error);
      return null;
    }
  }

  private getStatusMessage(status: JobStatus, progress: number): string {
    switch (status) {
      case JobStatus.WAITING:
        return "Job is waiting to start...";
      case JobStatus.ACTIVE:
        if (progress < 10) return "Fetching user information...";
        if (progress < 30) return "Loading playlists...";
        if (progress < 80) return "Processing tracks...";
        if (progress < 95) return "Fetching artist details...";
        return "Finalizing data...";
      case JobStatus.COMPLETED:
        return "Data sync completed successfully!";
      case JobStatus.FAILED:
        return "Data sync failed. Please try again.";
      default:
        return "Unknown status";
    }
  }

  async getUserActiveJob(userId: string): Promise<string | null> {
    const activeJobs = await this.persistQueue.getJobs(["waiting", "active"]);
    const userJob = activeJobs.find((job) => job.data.userId === userId);
    return userJob ? userJob.id! : null;
  }

  async cleanup(): Promise<void> {
    await this.persistWorker.close();
    await this.persistQueue.close();
  }
}
