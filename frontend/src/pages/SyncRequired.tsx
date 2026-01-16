import { useQuery } from "@tanstack/react-query";
import { Database, RefreshCw } from "lucide-react";
import { Page } from "../components/Page";
import { baseAPI } from "../services/api";

export function SyncRequired() {
  const { data: syncStatus } = useQuery({
    queryKey: ["sync-status"],
    queryFn: async () => {
      const response = await baseAPI.getSyncStatus();
      return response.data as {
        hasData?: boolean;
        hasActiveJob?: boolean;
        progress?: number;
        message?: string;
      };
    },
    retry: false,
  });

  const openSyncModal = () => {
    (
      document.getElementById("syncModal") as HTMLDialogElement | null
    )?.showModal?.();
  };

  return (
    <Page>
      <div className="max-w-2xl mx-auto">
        <div className="rounded-box border border-base-200 bg-base-100 p-6 shadow-xl shadow-black/30">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-box bg-primary/10 text-primary border border-primary/20">
              <Database className="size-6" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Sync required</h1>
              <p className="text-base-content/70 mt-2">
                SmartSpotify needs to cache your Spotify library for faster
                access. Start a sync to unlock playlists, artists, albums, and
                analysis.
              </p>

              {syncStatus?.hasActiveJob && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">
                    {syncStatus.message || "Sync in progress…"}
                  </p>
                  <progress
                    className="progress progress-primary w-full"
                    value={syncStatus.progress ?? 0}
                    max="100"
                  ></progress>
                </div>
              )}

              <button
                className="btn btn-primary w-full mt-6"
                onClick={openSyncModal}
              >
                <RefreshCw size={14} />
                Sync data with Spotify
              </button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
