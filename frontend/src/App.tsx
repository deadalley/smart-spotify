import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Artists } from "./pages/Artists";
import { ArtistView } from "./pages/ArtistView";
import { AlbumView } from "./pages/AlbumView";
import { Home } from "./pages/Home";
import { Playlists } from "./pages/Playlists";
import { PlaylistView } from "./pages/PlaylistView";
import { SavedTracks } from "./pages/SavedTracks";
import { Settings } from "./pages/Settings";
import { SyncRequired } from "./pages/SyncRequired";
import { Layout } from "./components/Layout";
import { RequireSpotify } from "./components/RequireSpotify";

// Liked Songs is Spotify-only (see RequireSpotify), so land YouTube Music
// users on Playlists instead.
function IndexRedirect() {
  const { source } = useAuth();
  return (
    <Navigate
      to={source === "spotify" ? "/saved-tracks" : "/playlists"}
      replace
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SettingsProvider>
          <Routes>
            <Route path="/login" element={<Home />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<IndexRedirect />} />
              <Route path="sync" element={<SyncRequired />} />
              <Route path="playlists" element={<Playlists />} />
              <Route path="playlists/:id" element={<PlaylistView />} />
              <Route
                path="saved-tracks"
                element={
                  <RequireSpotify>
                    <SavedTracks />
                  </RequireSpotify>
                }
              />
              <Route path="artists" element={<Artists />} />
              <Route path="artists/:id" element={<ArtistView />} />
              <Route path="albums/:id" element={<AlbumView />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SettingsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
