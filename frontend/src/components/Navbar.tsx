import { Heart, LogOut, Music, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { SmartSpotifyLogo } from "./SmartSpotifyLogo";
import { SyncModal } from "./SyncModal";

export function Navbar() {
  const { logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const navLinks = [
    { path: "/saved-tracks", label: "Liked Songs", icon: Heart },
    { path: "/playlists", label: "Playlists", icon: Music },
    { path: "/artists", label: "Artists", icon: Users },
  ];

  return (
    <nav className="bg-base-300 border-b border-base-200 sticky top-0 z-50">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex font-bold text-lg gap-2 items-center text-base-content hover:text-primary transition-colors group"
          >
            <SmartSpotifyLogo className="size-6 group-hover:scale-110 transition-transform text-primary" />
            <span>Smart Spotify</span>
          </Link>

          <div className="flex items-center gap-6">
            <ul className="flex items-center gap-1">
              {navLinks.map(({ path, label, icon: Icon }) => (
                <li key={path}>
                  <Link
                    to={path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                      isActive(path)
                        ? "bg-primary/10 text-primary"
                        : "text-base-content/70 hover:text-base-content hover:bg-base-300/50"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 pl-4 border-l border-base-200">
              <SyncModal />
              <button
                onClick={handleLogout}
                className="btn btn-ghost btn-sm gap-2"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
