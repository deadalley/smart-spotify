import { Route, Routes } from "react-router-dom";
import "./App.css";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./contexts/AuthContext";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { PlaylistView } from "./pages/PlaylistView";
import { Playlists } from "./pages/Playlists";
import { Search } from "./pages/Search";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="playlists" element={<Playlists />} />
          <Route path="playlists/:id" element={<PlaylistView />} />
          <Route path="search" element={<Search />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
