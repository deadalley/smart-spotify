import { RefreshCw, Trash } from "lucide-react";
import { useState } from "react";
import { spotifyAPI } from "../services/api";

export function SyncModal() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setIsLoading(true);
    setError(null);
    setSyncProgress(0);
    setSyncMessage("Starting sync...");

    try {
      setSyncProgress(10);
      setSyncMessage("Fetching user data...");

      await new Promise((resolve) => setTimeout(resolve, 500));
      setSyncProgress(30);
      setSyncMessage("Loading playlists...");

      await new Promise((resolve) => setTimeout(resolve, 500));
      setSyncProgress(60);
      setSyncMessage("Processing tracks and artists...");

      await spotifyAPI.persist();

      setSyncProgress(90);
      setSyncMessage("Finalizing...");

      await new Promise((resolve) => setTimeout(resolve, 500));
      setSyncProgress(100);
      setSyncMessage("Sync completed successfully!");

      setTimeout(() => {
        setIsLoading(false);
        setSyncProgress(0);
        setSyncMessage("");
        (document.getElementById("syncModal") as HTMLDialogElement)?.close();
      }, 1000);
    } catch (err) {
      let errorMessage = "Failed to sync data";
      if (err && typeof err === "object" && "response" in err) {
        const response = (err as { response?: { data?: { error?: string } } })
          .response;
        errorMessage = response?.data?.error || "Failed to sync data";
      }
      setError(errorMessage);
      setIsLoading(false);
      setSyncProgress(0);
      setSyncMessage("");
    }
  };

  return (
    <>
      <dialog id="syncModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Sync Spotify data</h3>

          {!isLoading ? (
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
                <p className="text-sm font-medium mb-2">{syncMessage}</p>
                <progress
                  className="progress progress-primary w-full"
                  value={syncProgress}
                  max="100"
                ></progress>
                <p className="text-xs text-base-content/60 mt-1">
                  {syncProgress}% complete
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error mb-4">
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="modal-action">
            <form method="dialog">
              <button className="btn" disabled={isLoading}>
                Close
              </button>
            </form>
            <button className="btn btn-error" disabled={isLoading}>
              <Trash size={14} />
              Delete data
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSync}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <RefreshCw size={14} />
              )}
              Sync
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
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
