import { useAuth } from "../contexts/AuthContext";
import { SpotifyLogo } from "../components/SpotifyLogo";
import { YouTubeLogo } from "../components/YouTubeLogo";

export function Home() {
  const { setSource, login } = useAuth();

  return (
    <div className="w-screen h-screen flex flex-col justify-center items-center">
      <div className="flex flex-col gap-5 items-center max-w-lg w-full px-6">
        <h1 className="text-4xl font-bold text-center">Smart Music</h1>

        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div
              className="card size-64 bg-base-100 shadow-sm hover:translate-y-[-2px] transition-transform duration-200 cursor-pointer hover:shadow-lg hover:shadow-[color:var(--color-primary-spotify)]/30"
              onClick={() => {
                setSource("spotify");
                login("spotify");
              }}
            >
              <div className="card-body justify-center items-center gap-8 hover:text-[color:var(--color-primary-spotify)]">
                <SpotifyLogo className="size-14 text-[color:var(--color-primary-spotify)]" />
                <span className="text-lg font-medium text-center">
                  Login with Spotify
                </span>
              </div>
            </div>

            <div
              className="card size-64 bg-base-100 shadow-sm hover:translate-y-[-2px] transition-transform duration-200 cursor-pointer hover:shadow-lg hover:shadow-[color:var(--color-primary-youtube)]/30"
              onClick={() => {
                setSource("youtube");
                login("youtube");
              }}
            >
              <div className="card-body justify-center items-center gap-4 hover:text-[color:var(--color-primary-youtube)]">
                <YouTubeLogo className="size-18 text-[color:var(--color-primary-youtube)] mt-6" />
                <span className="text-lg font-medium text-center">
                  Login with YouTube Music
                </span>
              </div>
            </div>
          </div>

          <div
            className="card bg-base-100 shadow-sm hover:translate-y-[-2px] transition-transform duration-200 cursor-pointer hover:shadow-lg w-full"
            onClick={() => {}}
          >
            <div className="card-body justify-center items-center gap-8">
              <span className="text-lg font-medium text-center">
                Compare libraries
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
