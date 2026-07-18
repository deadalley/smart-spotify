import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Liked Songs has no YouTube Music equivalent synced today, so the page
// only makes sense for Spotify accounts.
export function RequireSpotify({ children }: { children: ReactNode }) {
  const { source } = useAuth();

  if (source !== "spotify") {
    return <Navigate to="/playlists" replace />;
  }

  return <>{children}</>;
}
