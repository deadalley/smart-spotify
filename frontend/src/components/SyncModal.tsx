import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, Trash } from "lucide-react";
import { useEffect, useReducer, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { baseAPI } from "../services/api";

interface SyncState {
  isLoading: boolean;
  syncProgress: number;
  syncMessage: string;
  error: string | null;
  currentJobId: string | null;
  completion: "sync" | "delete" | null;
}

type SyncAction =
  | { type: "START_SYNC"; message?: string }
  | { type: "UPDATE_PROGRESS"; progress: number; message: string }
  | { type: "SET_JOB_ID"; jobId: string }
  | { type: "COMPLETE_SYNC"; message: string }
  | { type: "COMPLETE_DELETE"; message: string }
  | { type: "FAIL_SYNC"; error: string }
  | { type: "RESET" }
  | { type: "RESUME_JOB"; jobId: string; progress: number; message: string };

const initialState: SyncState = {
  isLoading: false,
  syncProgress: 0,
  syncMessage: "",
  error: null,
  currentJobId: null,
  completion: null,
};

type SyncStep = {
  key: "user" | "playlists" | "tracks" | "artists";
  label: string;
  minProgress: number;
};

const SYNC_STEPS: readonly SyncStep[] = [
  { key: "user", label: "User info", minProgress: 5 },
  { key: "playlists", label: "Playlists", minProgress: 25 },
  { key: "tracks", label: "Tracks", minProgress: 65 },
  { key: "artists", label: "Artists", minProgress: 80 },
] as const;

function syncReducer(state: SyncState, action: SyncAction): SyncState {
  switch (action.type) {
    case "START_SYNC":
      return {
        ...state,
        isLoading: true,
        error: null,
        completion: null,
        syncProgress: 0,
        syncMessage: action.message || "Starting sync...",
      };
    case "UPDATE_PROGRESS":
      return {
        ...state,
        syncProgress: action.progress,
        syncMessage: action.message,
      };
    case "SET_JOB_ID":
      return {
        ...state,
        currentJobId: action.jobId,
      };
    case "COMPLETE_SYNC":
      return {
        ...state,
        isLoading: false,
        syncProgress: 100,
        syncMessage: action.message,
        completion: "sync",
      };
    case "COMPLETE_DELETE":
      return {
        ...state,
        isLoading: false,
        syncProgress: 100,
        syncMessage: action.message,
        completion: "delete",
      };
    case "FAIL_SYNC":
      return {
        ...initialState,
        error: action.error,
      };
    case "RESET":
      return initialState;
    case "RESUME_JOB":
      return {
        ...state,
        isLoading: true,
        completion: null,
        currentJobId: action.jobId,
        syncProgress: action.progress,
        syncMessage: action.message,
      };
    default:
      return state;
  }
}

export function SyncModal() {
  const [state, dispatch] = useReducer(syncReducer, initialState);
  const pollingIntervalRef = useRef<number | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isSuccess = state.completion === "sync" && state.syncProgress === 100;
  const syncMessageLower = state.syncMessage.toLowerCase();
  const isDeleting = state.isLoading && syncMessageLower.includes("delet");

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const pollJobStatus = () => {
    // Ensure we never create multiple polling intervals
    stopPolling();
    const poll = async () => {
      try {
        const response = await baseAPI.getSyncStatus();
        const jobStatus = response.data;

        // If no active job is found, the job might have completed and been cleaned up
        if (!jobStatus.hasActiveJob) {
          dispatch({
            type: "COMPLETE_SYNC",
            message: jobStatus.message || "Sync complete.",
          });
          stopPolling();
          // Invalidate all queries to refresh data
          queryClient.invalidateQueries();
          return;
        }

        dispatch({
          type: "UPDATE_PROGRESS",
          progress: jobStatus.progress || 0,
          message: jobStatus.message || "Processing...",
        });

        if (jobStatus.status === "completed") {
          dispatch({
            type: "COMPLETE_SYNC",
            message: jobStatus.message || "Sync complete.",
          });
          stopPolling();
          // Invalidate all queries to refresh data
          queryClient.invalidateQueries();
        } else if (jobStatus.status === "failed") {
          dispatch({
            type: "FAIL_SYNC",
            error: jobStatus.error || "Job failed",
          });
          stopPolling();
        }
      } catch (error) {
        console.error("Error polling job status:", error);
        dispatch({
          type: "FAIL_SYNC",
          error: "Failed to get job status",
        });
        stopPolling();
      }
    };

    poll();
    pollingIntervalRef.current = window.setInterval(poll, 1000);
  };

  const checkForActiveJob = async () => {
    try {
      const response = await baseAPI.getSyncStatus();
      const activeJob = response.data;

      if (
        activeJob.hasActiveJob &&
        activeJob.status !== "completed" &&
        activeJob.status !== "failed"
      ) {
        dispatch({
          type: "RESUME_JOB",
          jobId: activeJob.jobId,
          progress: activeJob.progress || 0,
          message: activeJob.message || "Resuming existing sync...",
        });
        pollJobStatus();
      }
    } catch (error) {
      console.error("Error checking for active job:", error);
    }
  };

  useEffect(() => {
    checkForActiveJob();

    return () => stopPolling();
  }, []);

  const handleSync = async () => {
    dispatch({ type: "START_SYNC", message: "Starting sync..." });

    try {
      const activeJobResponse = await baseAPI.getSyncStatus();
      const activeJob = activeJobResponse.data;

      if (
        activeJob.hasActiveJob &&
        activeJob.status !== "completed" &&
        activeJob.status !== "failed"
      ) {
        dispatch({
          type: "RESUME_JOB",
          jobId: activeJob.jobId,
          progress: activeJob.progress || 0,
          message: activeJob.message || "Resuming existing sync...",
        });
        pollJobStatus();
      } else {
        const response = await baseAPI.persist();
        const jobData = response.data;

        if (jobData.success && jobData.jobId) {
          dispatch({ type: "SET_JOB_ID", jobId: jobData.jobId });
          dispatch({
            type: "UPDATE_PROGRESS",
            progress: 0,
            message: "Job started, fetching progress...",
          });
          pollJobStatus();
        } else {
          throw new Error(jobData.message || "Failed to start sync job");
        }
      }
    } catch (err) {
      console.error("Error starting sync:", err);
      let errorMessage = "Failed to sync data";
      if (err && typeof err === "object" && "response" in err) {
        const response = (err as { response?: { data?: { error?: string } } })
          .response;
        errorMessage = response?.data?.error || "Failed to sync data";
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      dispatch({ type: "FAIL_SYNC", error: errorMessage });
    }
  };

  const handleClose = () => {
    // If a sync job is running, allow closing the modal while keeping
    // polling/state alive so the navbar button can reflect progress.
    if (!state.isLoading) {
      stopPolling();
      dispatch({ type: "RESET" });
    }
    (document.getElementById("syncModal") as HTMLDialogElement)?.close();
  };

  const handleStartSmartSpotify = () => {
    handleClose();
    navigate("/", { replace: true });
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete all synced data?")) {
      return;
    }

    try {
      dispatch({ type: "START_SYNC", message: "Deleting data..." });
      await baseAPI.deleteData();

      // Invalidate all queries to clear cached data
      await queryClient.invalidateQueries();

      dispatch({
        type: "COMPLETE_DELETE",
        message: "Data deleted successfully!",
      });
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error("Error deleting data:", error);
      let errorMessage = "Failed to delete data";
      if (error && typeof error === "object" && "response" in error) {
        const response = (error as { response?: { data?: { error?: string } } })
          .response;
        errorMessage = response?.data?.error || "Failed to delete data";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      dispatch({ type: "FAIL_SYNC", error: errorMessage });
    }
  };

  return (
    <>
      <dialog id="syncModal" className="modal">
        <div className="modal-box">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-lg font-bold">Sync Spotify data</h3>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-circle"
                onClick={handleClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {!state.isLoading && state.syncProgress < 100 && (
            <div className="mt-4 rounded-box border border-primary/30 bg-base-200/20 p-4">
              <ul className="list-disc pl-5 space-y-1 text-sm text-base-content/80">
                <li>
                  In order to manage your entire Spotify library, SmartSpotify
                  needs to{" "}
                  <span className="font-semibold text-base-content">
                    cache your data
                  </span>{" "}
                  for faster access.
                </li>
                <li>
                  Your account data{" "}
                  <span className="font-semibold text-base-content">
                    belongs to you
                  </span>{" "}
                  and will only be used to run analysis on your Spotify library.
                </li>
                <li>You can delete the cached data anytime</li>
                <li>
                  Any changes you make in SmartSpotify will be{" "}
                  <span className="font-semibold text-base-content">
                    automatically
                  </span>{" "}
                  synced to Spotify.
                </li>
                <li>
                  Changes you make in Spotify need to be{" "}
                  <span className="font-semibold text-base-content">
                    manually
                  </span>{" "}
                  synced to SmartSpotify.
                </li>
              </ul>
            </div>
          )}

          {isSuccess && (
            <div className="py-4">
              <div className="flex flex-col items-center text-center gap-3 py-2">
                <CheckCircle2 className="size-16 text-success" />
                <div>
                  <div className="text-lg font-bold">Sync complete</div>
                  <div className="text-sm text-base-content/70 mt-1">
                    {state.syncMessage || "Your data is ready."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isSuccess && state.isLoading && (
            <div className="py-4">
              <div className="mb-3">
                <p className="text-sm font-medium mb-2">{state.syncMessage}</p>
                <progress
                  className="progress progress-primary w-full"
                  value={state.syncProgress}
                  max="100"
                ></progress>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-base-content/60">
                    {state.syncProgress}% complete
                  </p>
                </div>
              </div>

              {!isDeleting && (
                <ul className="steps steps-vertical">
                  {SYNC_STEPS.map((step) => (
                    <li
                      key={step.key}
                      className={
                        state.syncProgress >= step.minProgress
                          ? "step step-primary"
                          : "step"
                      }
                    >
                      {step.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {state.error && (
            <div className="alert alert-error mb-4">
              <span className="text-sm">{state.error}</span>
            </div>
          )}

          {state.syncProgress === 100 && !state.error ? (
            <button
              className="btn btn-primary w-full mt-2"
              onClick={handleStartSmartSpotify}
            >
              Start SmartSpotify
            </button>
          ) : (
            <div className="modal-action flex flex-col gap-2">
              <button
                className="btn btn-error w-full"
                onClick={handleDelete}
                disabled={state.isLoading}
              >
                <Trash size={14} />
                Delete data
              </button>
              <button
                className="btn btn-primary w-full"
                onClick={handleSync}
                disabled={state.isLoading}
              >
                {state.isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <RefreshCw size={14} />
                )}
                {state.isLoading ? "Syncing data..." : "Sync data with Spotify"}
              </button>
            </div>
          )}
        </div>
        <div
          className="modal-backdrop"
          onClick={state.isLoading ? undefined : handleClose}
        ></div>
      </dialog>
      <button
        className="btn btn-primary btn-sm"
        // @ts-expect-error daisyUI adds this
        onClick={() => document.getElementById("syncModal")?.showModal()}
      >
        {state.isLoading ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : (
          <RefreshCw size={14} />
        )}
        {state.isLoading
          ? `Syncing${state.syncProgress ? ` (${state.syncProgress}%)` : "…"}`
          : "Sync"}
      </button>
    </>
  );
}
