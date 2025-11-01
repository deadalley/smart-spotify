import { Navigate } from "react-router-dom";
import { PageLoading } from "../components/Loading";
import { SpotifyLogo } from "../components/SpotifyLogo";

export function Login() {
  // const { isAuthenticated, login, isLoading } = useAuth();
  const isLoading = false;
  const isAuthenticated = false;
  const login = () => {
    window.location.href = "/api/auth/login";
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="w-screen h-screen flex flex-col justify-center items-center">
      <div className="flex flex-col gap-4 items-center">
        <h1 className="flex gap-4 text-4xl font-bold text-primary justify-center items-center">
          <SpotifyLogo className="size-8" /> Smart Spotify
        </h1>

        <button onClick={login} className="btn btn-primary btn-lg w-fit gap-2">
          Login with Spotify
        </button>
      </div>
    </div>
  );
}
