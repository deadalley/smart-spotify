import { LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { SpotifyLogo } from "./SpotifyLogo";
import { SyncModal } from "./SyncModal";

export function Navbar() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="navbar bg-zinc-900">
      <div className="flex-1">
        <Link to="/" className="flex font-bold text-xl gap-2 px-4 items-center">
          <SpotifyLogo className="size-5" />
          Smart Spotify
        </Link>
      </div>
      <div className="flex items-center">
        <ul className="menu menu-horizontal px-1 mr-4">
          <li>
            <a href="/playlists">Playlists</a>
          </li>
          <li>
            <a href="/saved-tracks">Liked Songs</a>
          </li>
          <li>
            <a href="/artists">Artists</a>
          </li>
          <li>
            <a href="/search">Search</a>
          </li>
        </ul>
        <div className="flex items-center gap-4">
          <SyncModal />
          <button onClick={handleLogout} className="btn btn-ghost btn-sm">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
