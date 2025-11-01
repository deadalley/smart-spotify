import { RefreshCw, Trash } from "lucide-react";
import { useEffect, useReducer, useRef } from "react";
import { spotifyAPI } from "../services/api";

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

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const pollJobStatus = (jobId: string) => {
    const poll = async () => {
      try {
        const response = await spotifyAPI.getJobStatus(jobId);
        const jobStatus = response.data;

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

          setTimeout(() => {
            dispatch({ type: "RESET" });
            (
              document.getElementById("syncModal") as HTMLDialogElement
            )?.close();
          }, 1500);
        } else if (jobStatus.status === "failed") {
          dispatch({
            type: "FAIL_SYNC",
            error: jobStatus.error || "Job failed",
          });
          stopPolling();
        }
      } catch {
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
      const response = await spotifyAPI.getPersistStatus();
      const activeJob = response.data;

      if (activeJob.hasActiveJob && activeJob.status !== "completed") {
        dispatch({
          type: "RESUME_JOB",
          jobId: activeJob.jobId,
          progress: activeJob.progress || 0,
          message: activeJob.message || "Resuming existing sync...",
        });
        pollJobStatus(activeJob.jobId);
      }
    } catch {}
  };

  useEffect(() => {
    checkForActiveJob();

    return () => stopPolling();
  }, []);

  const handleSync = async () => {
    dispatch({ type: "START_SYNC", message: "Starting sync..." });

    try {
      const activeJobResponse = await spotifyAPI.getPersistStatus();
      const activeJob = activeJobResponse.data;

      if (activeJob.hasActiveJob) {
        dispatch({
          type: "RESUME_JOB",
          jobId: activeJob.jobId,
          progress: activeJob.progress || 0,
          message: activeJob.message || "Resuming existing sync...",
        });
        pollJobStatus(activeJob.jobId);
      } else {
        const response = await spotifyAPI.persist();
        const jobData = response.data;

        if (jobData.success) {
          dispatch({ type: "SET_JOB_ID", jobId: jobData.jobId });
          dispatch({
            type: "UPDATE_PROGRESS",
            progress: 0,
            message: "Job started, fetching progress...",
          });
          pollJobStatus(jobData.jobId);
        } else {
          throw new Error(jobData.message || "Failed to start sync job");
        }
      }
    } catch (err) {
      let errorMessage = "Failed to sync data";
      if (err && typeof err === "object" && "response" in err) {
        const response = (err as { response?: { data?: { error?: string } } })
          .response;
        errorMessage = response?.data?.error || "Failed to sync data";
      }
      dispatch({ type: "FAIL_SYNC", error: errorMessage });
    }
  };

  const handleClose = () => {
    stopPolling();
    dispatch({ type: "RESET" });
    (document.getElementById("syncModal") as HTMLDialogElement)?.close();
  };

  return (
    <>
      <dialog id="syncModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Sync Spotify data</h3>

          {!state.isLoading ? (
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
            <button
              className="btn"
              onClick={handleClose}
              disabled={state.isLoading}
            >
              Close
            </button>
            <button className="btn btn-error" disabled={state.isLoading}>
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
