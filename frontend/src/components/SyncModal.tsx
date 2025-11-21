import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Trash } from "lucide-react";
import { useEffect, useReducer, useRef } from "react";
import { baseAPI } from "../services/api";

interface SyncState {
  isLoading: boolean;
  syncProgress: number;
  syncMessage: string;
  error: string | null;
  currentJobId: string | null;
}

type SyncAction =
  | { type: "START_SYNC"; message?: string }
  | { type: "UPDATE_PROGRESS"; progress: number; message: string }
  | { type: "SET_JOB_ID"; jobId: string }
  | { type: "COMPLETE_SYNC"; message: string }
  | { type: "FAIL_SYNC"; error: string }
  | { type: "RESET" }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  | { type: "RESUME_JOB"; jobId: string; progress: number; message: string };

const initialState: SyncState = {
  isLoading: false,
  syncProgress: 0,
  syncMessage: "",
  error: null,
  currentJobId: null,
};

function syncReducer(state: SyncState, action: SyncAction): SyncState {
  switch (action.type) {
    case "START_SYNC":
      return {
        ...state,
        isLoading: true,
        error: null,
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
        syncProgress: 100,
        syncMessage: action.message,
      };
    case "FAIL_SYNC":
      return {
        ...initialState,
        error: action.error,
      };
    case "RESET":
      return initialState;
    case "SET_ERROR":
      return {
        ...state,
        error: action.error,
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    case "RESUME_JOB":
      return {
        ...state,
        isLoading: true,
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

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const pollJobStatus = () => {
    const poll = async () => {
      try {
        const response = await baseAPI.getSyncStatus();
        const jobStatus = response.data;

        // If no active job is found, the job might have completed and been cleaned up
        if (!jobStatus.hasActiveJob) {
          dispatch({
            type: "COMPLETE_SYNC",
            message: "Sync completed successfully!",
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
            message: "Sync completed successfully!",
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
    stopPolling();
    dispatch({ type: "RESET" });
    (document.getElementById("syncModal") as HTMLDialogElement)?.close();
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
        type: "COMPLETE_SYNC",
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
          <h3 className="text-lg font-bold">Sync Spotify data</h3>

          {state.syncProgress === 100 && !state.error ? (
            <div className="py-4">
              <div className="alert alert-success">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 shrink-0 stroke-current"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{state.syncMessage}</span>
              </div>
            </div>
          ) : !state.isLoading ? (
            <p className="py-4 text-sm text-base-content/70">
              For Smart Spotify to work, it has to store your Spotify data
              temporarily for faster access. By clicking the "Sync" button,
              Smart Spotify will load the relevant data from your library.
              <br />
              <br />
              This process does not alter any data on your Spotify account.
              <br />
              <br />
              This data is deleted periodically, upon logout, or at your
              request.
            </p>
          ) : (
            <div className="py-4">
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">{state.syncMessage}</p>
                <progress
                  className="progress progress-primary w-full"
                  value={state.syncProgress}
                  max="100"
                ></progress>
                <p className="text-xs text-base-content/60 mt-1">
                  {state.syncProgress}% complete
                </p>
              </div>
            </div>
          )}

          {state.error && (
            <div className="alert alert-error mb-4">
              <span className="text-sm">{state.error}</span>
            </div>
          )}

          <div className="modal-action">
            {state.syncProgress === 100 && !state.error ? (
              <button className="btn btn-primary" onClick={handleClose}>
                Close
              </button>
            ) : (
              <>
                <button
                  className="btn"
                  onClick={handleClose}
                  disabled={state.isLoading}
                >
                  Close
                </button>
                <button
                  className="btn btn-error"
                  onClick={handleDelete}
                  disabled={state.isLoading}
                >
                  <Trash size={14} />
                  Delete data
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSync}
                  disabled={state.isLoading}
                >
                  {state.isLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Sync
                </button>
              </>
            )}
          </div>
        </div>
        <div className="modal-backdrop" onClick={handleClose}>
          <button>close</button>
        </div>
      </dialog>
      <button
        className="btn btn-primary btn-sm"
        // @ts-expect-error daisyUI adds this
        onClick={() => document.getElementById("syncModal")?.showModal()}
      >
        <RefreshCw size={14} />
        Sync
      </button>
    </>
  );
}
