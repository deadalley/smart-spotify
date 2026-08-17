import { ExternalLink } from "lucide-react";

export function SourceLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-primary btn-sm"
    >
      <ExternalLink className="size-4 mr-2" />
      Open externally
    </a>
  );
}
