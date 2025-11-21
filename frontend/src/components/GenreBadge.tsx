import { Music } from "lucide-react";

export function GenreBadge({
  genre,
  size = "sm",
  variant = "primary",
  className = "",
}: {
  genre: { name: string; count?: number };
  size?: "xs" | "sm" | "lg";
  variant?: "primary" | "warning" | "error" | "default";
  className?: string;
}) {
  const variantClass =
    variant === "error"
      ? "badge-error"
      : variant === "primary"
      ? "badge-primary"
      : variant === "warning"
      ? "badge-warning"
      : "";

  return (
    <span
      key={genre.name}
      className={`badge badge-${size} ${variantClass} capitalize flex items-center ${className}`}
    >
      <span>{genre.name}</span>
      <span className="flex items-center gap-1">
        <Music size={size === "xs" ? 8 : size === "sm" ? 10 : 16} />
        {genre.count}
      </span>
    </span>
  );
}
