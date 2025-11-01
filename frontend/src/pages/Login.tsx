import { Navigate } from "react-router-dom";
import { SpotifyLogo } from "../components/SpotifyLogo";

export function Login() {
  // const { isAuthenticated, login, isLoading } = useAuth();
  const isLoading = false;
  const isAuthenticated = false;
  const login = () => {
    window.location.href = "/api/auth/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen hero bg-linear-to-br from-base-100 to-base-200">
      <div className="flex flex-col gap-4 items-center">
        <h1 className="flex gap-2 text-4xl font-bold text-primary justify-center items-center">
          <SpotifyLogo className="size-8" /> Smart Spotify
        </h1>

        <button onClick={login} className="btn btn-primary btn-lg w-fit gap-2">
          Login with Spotify
        </button>
      </div>
    </div>
  );
}
