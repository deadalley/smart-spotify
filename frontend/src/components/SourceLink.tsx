import { useAuth } from "../contexts/AuthContext";
import { SOURCE_LABELS } from "../utils";
import { SpotifyLogo } from "./SpotifyLogo";
import { YouTubeLogo } from "./YouTubeLogo";

export function SourceLink({ href }: { href: string }) {
  const { source } = useAuth();
  const Logo = source === "youtube" ? YouTubeLogo : SpotifyLogo;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-primary btn-sm"
    >
      <Logo className="size-4 mr-2" />
      Open in {SOURCE_LABELS[source]}
    </a>
  );
}
