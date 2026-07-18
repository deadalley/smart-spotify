import { useQuery } from "@tanstack/react-query";
import { Database, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Page } from "../components/Page";
import { useAuth } from "../contexts/AuthContext";
import { baseAPI } from "../services/api";
import { getAppName, SOURCE_LABELS } from "../utils";

export function SyncRequired() {
  const { source } = useAuth();
  const sourceLabel = SOURCE_LABELS[source];
  const appName = getAppName(source);

  const { data: syncStatus } = useQuery({
    queryKey: ["sync-status"],
    queryFn: async () => {
      const response = await baseAPI.getSyncStatus();
      return response.data as {
        hasData?: boolean;
        hasActiveJob?: boolean;
        dataExpired?: boolean;
        lastSyncedAt?: string;
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

  // Prompt the user to sync right away instead of making them find the button.
  useEffect(() => {
    openSyncModal();
  }, []);

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
              {syncStatus?.dataExpired ? (
                <div className="alert alert-warning mt-2">
                  <span className="text-sm">
                    Your cached {sourceLabel} data automatically expired after
                    30 days of inactivity
                    {syncStatus.lastSyncedAt
                      ? ` (last synced ${new Date(
                          syncStatus.lastSyncedAt,
                        ).toLocaleDateString()})`
                      : ""}
                    . Sync again to refresh it.
                  </span>
                </div>
              ) : (
                <p className="text-base-content/70 mt-2">
                  {appName} needs to cache your {sourceLabel} library for
                  faster access. Start a sync to unlock playlists, artists,
                  albums, and analysis.
                </p>
              )}

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
                Sync data with {sourceLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
