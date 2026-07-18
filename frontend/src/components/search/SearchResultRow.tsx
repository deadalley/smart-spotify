import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

export function SearchResultRow({
  to,
  image,
  FallbackIcon,
  shape,
  title,
  subtitle,
  onNavigate,
}: {
  to: string;
  image?: string | null;
  FallbackIcon: LucideIcon;
  shape: "square" | "circle";
  title: string;
  subtitle?: string | null;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        to={to}
        onClick={onNavigate}
        className="flex items-center gap-3 p-2 rounded-md hover:bg-base-200 transition-colors"
      >
        <div
          className={`size-10 shrink-0 overflow-hidden ${
            shape === "circle" ? "rounded-full" : "rounded"
          }`}
        >
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-base-300/50 flex items-center justify-center">
              <FallbackIcon size={16} className="text-base-content/30" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="font-medium truncate">{title}</p>
          {subtitle && (
            <p className="text-xs text-base-content/50 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
