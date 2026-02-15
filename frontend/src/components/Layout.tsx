import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { baseAPI } from "../services/api";
import { Navbar } from "./Navbar";

export function Layout() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  const { data: syncStatus, isLoading: isSyncStatusLoading } = useQuery({
    queryKey: ["sync-status"],
    queryFn: async () => {
      const response = await baseAPI.getSyncStatus();
      return response.data as { hasData?: boolean };
    },
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content">Loading...</p>
        </div>
      </div>
    );
  }

  // Gate the app until a first successful sync has created library cache in Redis.
  if (isSyncStatusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content">Loading...</p>
        </div>
      </div>
    );
  }

  const hasData = syncStatus?.hasData;
  if (hasData === false && location.pathname !== "/sync") {
    return <Navigate to="/sync" replace />;
  }

  return (
    <div className="size-screen bg-base-300">
      <Navbar />
      <Outlet />
    </div>
  );
}
