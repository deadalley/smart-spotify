import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export function SearchResultSection({
  label,
  Icon,
  count,
  children,
}: {
  label: string;
  Icon: LucideIcon;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-base-content/50 mb-1 px-2">
        <Icon size={12} />
        <span>
          {label} · {count}
        </span>
      </div>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}
