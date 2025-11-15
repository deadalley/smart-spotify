import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./contexts/AuthContext";
import { Artists } from "./pages/Artists";
import { ArtistView } from "./pages/ArtistView";
import { Login } from "./pages/Login";
import { Playlists } from "./pages/Playlists";
import { PlaylistView } from "./pages/PlaylistView";
import { SavedTracks } from "./pages/SavedTracks";
import { Search } from "./pages/Search";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/saved-tracks" replace />} />
          <Route path="playlists" element={<Playlists />} />
          <Route path="playlists/:id" element={<PlaylistView />} />
          <Route path="saved-tracks" element={<SavedTracks />} />
          <Route path="artists" element={<Artists />} />
          <Route path="artists/:id" element={<ArtistView />} />
          <Route path="search" element={<Search />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
