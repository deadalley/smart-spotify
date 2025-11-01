import { Job, Queue, Worker } from "bullmq";
import {
  getPersistJobStatusMessage,
  PersistJobData,
  persistUserDataJob,
} from "../jobs/persistUserData";
import { JobProgress, JobQueues, Jobs, JobStatus } from "../types/index";

export class BullService {
  private persistQueue: Queue;
  private persistWorker: Worker;

  constructor() {
    this.persistQueue = new Queue(JobQueues.PERSIST_USER_DATA, {
      connection: {
        host: "localhost",
        port: 6379,
      },
    });

    this.persistWorker = new Worker(
      JobQueues.PERSIST_USER_DATA,
      async (job: Job<PersistJobData>) => {
        return persistUserDataJob(job);
      },
      {
        connection: {
          host: "localhost",
          port: 6379,
        },
        concurrency: 1, // Process one persist job at a time
      }
    );

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

  async getActiveJob(userId: string): Promise<string | null> {
    const activeJobs = await this.persistQueue.getJobs(["waiting", "active"]);
    const userJob = activeJobs.find((job) => job.data.userId === userId);
    return userJob ? userJob.id! : null;
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
        progress: Number(job.progress || 0),
        startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
        completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      };

      if (status === JobStatus.FAILED && job.failedReason) {
        progress.error = job.failedReason;
      }

      return progress;
    } catch (error) {
      console.error("Error getting job status:", error);
      return null;
    }
  }

  async cleanup(): Promise<void> {
    await this.persistWorker.close();
    await this.persistQueue.close();
  }

  // Jobs
  async startPersistJob(userId: string, accessToken: string): Promise<string> {
    // Check if there's already an active job for this user
    const activeJobs = await this.persistQueue.getJobs(["waiting", "active"]);
    const existingJob = activeJobs.find((job) => job.data.userId === userId);

    if (existingJob) {
      return existingJob.id!;
    }

    // Create a new job
    const job = await this.persistQueue.add(
      Jobs.PERSIST_USER_DATA,
      { userId, accessToken },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 5, // Keep last 5 completed jobs
        removeOnFail: 5, // Keep last 5 failed jobs
      }
    );

    return job.id!;
  }

  async getPersistJobStatus(userId: string): Promise<JobProgress | null> {
    const activeJobs = await this.persistQueue.getJobs([
      "waiting",
      "active",
      "completed",
      "failed",
    ]);
    const userJob = activeJobs.find((job) => job.data.userId === userId);

    if (!userJob) {
      return null;
    }

    return this.getJobStatus(userJob.id!);
  }

  async getPersistJobStatusMessage(userId: string): Promise<string | null> {
    const jobProgress = await this.getPersistJobStatus(userId);
    return getPersistJobStatusMessage(jobProgress?.progress || 0);
  }
}
