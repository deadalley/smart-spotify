import { SpotifyLogo } from "./SpotifyLogo";

export function SpotifyLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-primary btn-sm"
    >
      <SpotifyLogo className="size-4 mr-2" />
      Open in Spotify
    </a>
  );
}
