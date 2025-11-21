// BullMQ types
export enum JobQueues {
  PERSIST_USER_DATA = "smart-spotify-persist-user-data",
}

export enum Jobs {
  PERSIST_USER_DATA = "persist-user-data",
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
  message?: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
